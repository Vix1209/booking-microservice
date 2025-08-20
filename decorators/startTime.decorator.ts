/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';

export function IsAtLeast15MinFromNow(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAtLeast15MinFromNow',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          const nowPlus15 = new Date(Date.now() + 15 * 60 * 1000);
          return date >= nowPlus15;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 15 minutes from now`;
        },
      },
    });
  };
}
