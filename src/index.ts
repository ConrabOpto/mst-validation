import {
    IAnyType,
    isArrayType,
    SnapshotOut,
    types,
} from 'mobx-state-tree';
import { getSubType } from './utils';

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

const VALIDATION_IDENTIFIER = '\0Validation';
const INTERESCTION_IDENTIFIER = '\0IntersectionValidation';
const INTERSECTION_SEPERATOR = ' & ';

export function getErrorMessages(errorMessage: string): string | string[] {
    const parse = (error: string) => {
        const match = error.match(/Invalid value for type (.*)/);
        if (match) {
            return match[1].split(':')[1].trim();
        }
        return '';
    };

    const intersection = errorMessage.includes(INTERESCTION_IDENTIFIER);
    if (intersection) {
        return parse(errorMessage).split(INTERSECTION_SEPERATOR);
    }

    const validation = errorMessage.includes(VALIDATION_IDENTIFIER);
    if (validation) {
        return parse(errorMessage);
    }

    return errorMessage;
}

function getErrors(errors: undefined | any[], errorMessage: string) {
    return [...(errors ?? []), getErrorMessages(errorMessage)].flat().filter(Boolean);
}

function setError(paths: any, message: any, validationLevel: any) {
    const path = paths[0].path;
    const type = paths[0].type;
    if (isArrayType(type)) {
        validationLevel[path] = [];
    }
    if (!path && paths.length === 1) {
        const errors = getErrors(validationLevel.errors, message);
        validationLevel.isValid = false;
        validationLevel.errors = errors;
    } else if (!path && paths.length > 1) {
        setError(paths.slice(1), message, validationLevel);
    } else if (paths.length > 1) {
        if (Array.isArray(validationLevel[path])) {
            validationLevel[path].push({});
            setError(paths.slice(1), message, validationLevel[path]);
        } else {
            validationLevel[path] = validationLevel[path] ?? {};
            setError(paths.slice(1), message, validationLevel[path]);
        }
    } else {
        const errors = getErrors(validationLevel.errors, message);
        validationLevel[path] = { isValid: false, errors };
    }
}

function setValidations(type: any, data: any, validations: any = {}): any {
    if (isArrayType(type)) {
        return !Array.isArray(data)
            ? []
            : data.map((d: any, index: any) =>
                  setValidations(getSubType(type, d), d, validations[index])
              );
    }
    if (!type.properties) {
        return validations?.errors
            ? { ...validations, value: data }
            : { isValid: true, errors: [], value: data };
    }
    for (let [key] of Object.entries(type.properties)) {
        validations[key] = setValidations(type.properties[key], data[key], validations[key]);
    }
    return validations;
}

export function validation<T>(validator: IAnyType, error: ((value: T) => string) | string) {
    return types.custom({
        name: VALIDATION_IDENTIFIER,
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
            const { isValid } = validate(validator, value);
            return isValid ? '' : typeof error === 'string' ? error : `${error(value)}`;
        },
    });
}

export function intersection<T>(...validators: IAnyType[]) {
    return types.custom({
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
            const invalid = validators.flatMap((v) => validate(v, value).errors);
            return !invalid.length ? '' : `${invalid.join(INTERSECTION_SEPERATOR)}`;
        },
    });
}

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type Validation<Type> = Expand<{
    isValid: boolean;
    errors: string[];
    value: Type;
}>;

type Validations<Type> = Expand<{
    [Key in keyof Omit<Type, symbol>]: Type[Key] extends Array<infer ArrayType>
        ? Array<Expand<Validations<ArrayType>>>
        : Type[Key] extends object
        ? Expand<Validations<Type[Key]>>
        : Validation<Type[Key]>;
}>;

export function validate<Type extends IAnyType, Data>(
    type: Type,
    data: Data
): {
    isValid: boolean;
    errors: string[];
    validations: Validations<SnapshotOut<Type>>;
} {
    const mstValidations = type.validate(data, [{ path: '', type }]);

    let validationErrors: any = {};
    let errors: string[] = [];
    mstValidations.forEach((v) => {
        setError(v.context, v.message, validationErrors);
        if (v.message) {
            errors.push(...getErrors([], v.message));
        }
    });
    const validations = setValidations(type, data, validationErrors);

    return {
        isValid: mstValidations.length ? false : true,
        validations,
        errors,
    };
}

export const rules = {
    validation,
    intersection,
};
