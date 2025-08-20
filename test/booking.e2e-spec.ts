import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../apps/booking-microservice/src/app.module';
import {
  Booking,
  BookingStatus,
} from '../apps/booking-microservice/src/booking/entities/booking.entity';
import { User } from '../apps/booking-microservice/src/authentication/users/entities/user.entity';
import { Auth } from '../apps/booking-microservice/src/authentication/auth/entities/auth.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Booking (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let authRepository: Repository<Auth>;
  let bookingRepository: Repository<Booking>;
  let accessToken: string;
  let testUser: User;

  const testUserData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+1234567890',
    location: 'Test City',
  };

  const testBookingData = {
    title: 'Test Meeting',
    description: 'Test Description',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    location: 'Conference Room A',
    notes: 'Test notes',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Auth, Booking],
          synchronize: true,
          dropSchema: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    authRepository = moduleFixture.get<Repository<Auth>>(
      getRepositoryToken(Auth),
    );
    bookingRepository = moduleFixture.get<Repository<Booking>>(
      getRepositoryToken(Booking),
    );

    await app.init();

    // Create test user
    testUser = userRepository.create(testUserData);
    await userRepository.save(testUser);

    // Create auth record for test user
    const authRecord = authRepository.create({
      hashedPassword: 'hashed_password',
      user: testUser,
    });
    await authRepository.save(authRecord);

    // Generate JWT token for authentication
    accessToken = jwtService.sign(
      { sub: testUser.id, email: testUser.email },
      { secret: 'test-secret', expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up bookings after each test
    await bookingRepository.delete({});
  });

  describe('/booking (POST)', () => {
    it('should create a new booking', () => {
      return request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testBookingData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe(testBookingData.title);
          expect(res.body.description).toBe(testBookingData.description);
          expect(res.body.userId).toBe(testUser.id);
          expect(res.body.status).toBe(BookingStatus.SCHEDULED);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/booking')
        .send(testBookingData)
        .expect(401);
    });

    it('should return 400 for invalid booking data', () => {
      const invalidData = {
        ...testBookingData,
        startTime: 'invalid-date',
      };

      return request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 for past start time', () => {
      const pastData = {
        ...testBookingData,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        endTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // Yesterday + 1 hour
      };

      return request(app.getHttpServer())
        .post('/booking')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(pastData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Start time must be in the future',
          );
        });
    });
  });

  describe('/booking (GET)', () => {
    beforeEach(async () => {
      // Create test bookings
      const booking1 = bookingRepository.create({
        ...testBookingData,
        title: 'Booking 1',
        userId: testUser.id,
        startTime: new Date(testBookingData.startTime),
        endTime: new Date(testBookingData.endTime),
      });
      const booking2 = bookingRepository.create({
        ...testBookingData,
        title: 'Booking 2',
        userId: testUser.id,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
      });
      await bookingRepository.save([booking1, booking2]);
    });

    it('should return all bookings for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/booking')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.data).toHaveLength(2);
          expect(res.body.meta.total).toBe(2);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/booking?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.meta.page).toBe(1);
          expect(res.body.meta.limit).toBe(1);
          expect(res.body.meta.totalPages).toBe(2);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/booking').expect(401);
    });
  });

  describe('/booking/upcoming (GET)', () => {
    beforeEach(async () => {
      // Create upcoming booking
      const upcomingBooking = bookingRepository.create({
        ...testBookingData,
        title: 'Upcoming Booking',
        userId: testUser.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
        status: BookingStatus.SCHEDULED,
      });
      await bookingRepository.save(upcomingBooking);
    });

    it('should return upcoming bookings', () => {
      return request(app.getHttpServer())
        .get('/booking/upcoming')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].title).toBe('Upcoming Booking');
        });
    });
  });

  describe('/booking/:id (GET)', () => {
    let testBooking: Booking;

    beforeEach(async () => {
      testBooking = bookingRepository.create({
        ...testBookingData,
        userId: testUser.id,
        startTime: new Date(testBookingData.startTime),
        endTime: new Date(testBookingData.endTime),
      });
      await bookingRepository.save(testBooking);
    });

    it('should return a specific booking', () => {
      return request(app.getHttpServer())
        .get(`/booking/${testBooking.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testBooking.id);
          expect(res.body.title).toBe(testBooking.title);
        });
    });

    it('should return 404 for non-existent booking', () => {
      return request(app.getHttpServer())
        .get('/booking/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400); // UUID validation error
    });
  });

  describe('/booking/:id (PATCH)', () => {
    let testBooking: Booking;

    beforeEach(async () => {
      testBooking = bookingRepository.create({
        ...testBookingData,
        userId: testUser.id,
        startTime: new Date(testBookingData.startTime),
        endTime: new Date(testBookingData.endTime),
      });
      await bookingRepository.save(testBooking);
    });

    it('should update a booking', () => {
      const updateData = {
        title: 'Updated Meeting',
        description: 'Updated Description',
      };

      return request(app.getHttpServer())
        .patch(`/booking/${testBooking.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe(updateData.title);
          expect(res.body.description).toBe(updateData.description);
        });
    });

    it('should return 404 for non-existent booking', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .patch(`/booking/${validUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  describe('/booking/:id (DELETE)', () => {
    let testBooking: Booking;

    beforeEach(async () => {
      testBooking = bookingRepository.create({
        ...testBookingData,
        userId: testUser.id,
        startTime: new Date(testBookingData.startTime),
        endTime: new Date(testBookingData.endTime),
      });
      await bookingRepository.save(testBooking);
    });

    it('should delete a booking', () => {
      return request(app.getHttpServer())
        .delete(`/booking/${testBooking.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent booking', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .delete(`/booking/${validUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
