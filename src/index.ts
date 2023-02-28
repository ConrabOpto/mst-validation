import { IAnyType, types } from 'mobx-state-tree';
import { IValidationError } from 'mobx-state-tree/dist/internal';

// union - No type is applicable for the union
// identifier - Value is not a valid identifier, expected a string
// identifierNumber - Value is not a valid identifierNumber, expected a number

// undefined - Value is not a undefined
// null - Value is not a null
// string - Value is not a string
// number - Value is not a number
// integer - Value is not a integer
// Date - Value is not a Date or unix milliseconds timestamp
// array - Value is not an array
// boolean - Value is not a boolean
// enumeration - Value is not a literal
// literal - Value is not a literal
// map - Value is not a plain object

const INTERESCTION_IDENTIFIER = '\0IntersectionValidation';
const INTERSECTION_SEPERATOR = ' & ';
const CUSTOM_ERROR = 'Invalid value for type ';

export const validationIssueCode = {
    undefined: { code: 'undefined', message: 'Value is not a undefined' },
    null: { code: 'null', message: 'Value is not a null' },
    number: { code: 'number', message: 'Value is not a number' },
    string: { code: 'string', message: 'Value is not a string' },
    integer: { code: 'integer', message: 'Value is not a integer' },
    Date: { code: 'Date', message: 'Value is not a Date or unix milliseconds timestamp' },
    array: { code: 'Array', message: 'Value is not an array' },
    boolean: { code: 'boolean', message: 'Value is not a boolean' },
    enumeration: { code: 'enumeration', message: 'Value is not a literal' },
    literal: { code: 'literal', message: 'Value is not a literal' },
    map: { code: 'map', message: 'Value is not a plain object' },
    union: { code: 'union', message: 'No type is applicable for the union' },
    intersection: { code: 'intersection', message: 'Not all types match the intersection' },
    identifier: {
        code: 'identifier',
        message: 'Value is not a valid identifier, expected a string',
    },
    identifierNumber: {
        code: 'identifierNumber',
        message: 'Value is not a valid identifierNumber, expected a number',
    },
} as const;

type ValidationIssueCodeType = typeof validationIssueCode[keyof typeof validationIssueCode];

type ValidationIssue = {
    code: string | ValidationIssueCodeType;
    path: (string | number)[];
    message: string;
    value: any;
};

type ValidationError = {
    issues: ValidationIssue[];
};

function parseErrorMessage(errorMessage: string | undefined) {
    if (!errorMessage) {
        return '';
    }
    const match = errorMessage.match(new RegExp(`${CUSTOM_ERROR}(.*)`));
    if (match) {
        return match[1].split(':')[1].trim();
    }
    return '';
}

function getErrors(error: IValidationError): ValidationIssue[] {
    const path = error.context.map((c) => c.path).filter(Boolean);
    const value = error.value;

    let errorMessage = error.message ?? '';
    if (errorMessage.includes(INTERESCTION_IDENTIFIER)) {
        const errorMessages = parseErrorMessage(error.message).split(INTERSECTION_SEPERATOR);
        return [
            {
                path,
                value,
                code: validationIssueCode.intersection.code,
                message: validationIssueCode.intersection.message,
            },
            {
                path,
                value,
                code:
                    Object.values(validationIssueCode).find((v) =>
                        errorMessages[0].startsWith(v.message)
                    )?.code ?? errorMessages[0],
                message: errorMessages[0],
            },
            ...(errorMessages.length > 1
                ? [
                      {
                          path,
                          value,
                          code:
                              Object.values(validationIssueCode).find((v) =>
                                  errorMessages[1].startsWith(v.message)
                              )?.code ?? errorMessages[1],
                          message: errorMessages[1],
                      },
                  ]
                : []),
        ];
    }

    if (errorMessage.includes(CUSTOM_ERROR)) {
        errorMessage = parseErrorMessage(error.message);
    }

    return [
        {
            path,
            value,
            code:
                Object.values(validationIssueCode).find((v) => errorMessage.startsWith(v.message))
                    ?.code ?? errorMessage,
            message: errorMessage,
        },
    ];
}

export function intersection<T extends IAnyType>(...validators: T[]) {
    return types.custom<T, T>({
        name: INTERESCTION_IDENTIFIER,
        fromSnapshot(value: T) {
            return value;
        },
        toSnapshot(value: T) {
            return value;
        },
        isTargetType(value: T) {
            return false; // always validate
        },
        getValidationMessage(value: T): string {
            const invalid = validators.flatMap((v) => {
                const result = validate(v, value);
                return result.success ? [] : result.error.issues.map((i) => i.message);
            });
            return !invalid.length ? '' : `${invalid.join(INTERSECTION_SEPERATOR)}`;
        },
    }) as T;
}

export function validate<Type extends IAnyType, Data>(
    type: Type,
    data: Data
):
    | {
          success: true;
          data: Data;
      }
    | { success: false; error: ValidationError } {
    const mstValidations = type.validate(data, [{ path: '', type }]);
    const issues = mstValidations.flatMap((v) => [...getErrors(v)]);
    if (!mstValidations.length) {
        return {
            success: true,
            data,
        };
    } else {
        return {
            success: false,
            error: {
                issues,
            },
        };
    }
}

export const rules = {
    code: validationIssueCode,
    intersection,
};
