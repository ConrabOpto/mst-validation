import { getType, IAnyType, Instance, isType, types } from 'mobx-state-tree';

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

function setError(paths: any, message: any, validationLevel: any, allErrors: any[]) {
    const path = paths[0].path;
    if (!path && paths.length === 1) {
        const errors = getErrors(validationLevel.errors, message);
        validationLevel.isValid = false;
        validationLevel.errors = errors;
        allErrors.push(...errors);
    } else if (!path && paths.length > 1) {
        setError(paths.slice(1), message, validationLevel, allErrors);
    } else if (paths.length > 1) {
        validationLevel[path] = validationLevel[path] ?? {};
        setError(paths.slice(1), message, validationLevel[path], allErrors);
    } else {
        const errors = getErrors(validationLevel.errors, message);
        validationLevel[path] = { isValid: false, errors };
        allErrors.push(...errors);
    }
}

function setValidations(data: any, validations: any) {
    if (!isObject(data)) {
        return validations?.errors
            ? { ...validations, value: data }
            : { isValid: true, errors: [], value: data };
    }

    for (let [key] of Object.entries(data)) {
        validations[key] = setValidations(data[key], validations[key]);
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

export function validate<T extends IAnyType>(modelOrType: T | Instance<T>, data: any): any {
    const type = isType(modelOrType) ? modelOrType : getType(modelOrType);
    const mstValidations = type.validate(data, [{ path: '', type }]);

    let validationErrors = {};
    let errors: any[] = [];
    mstValidations.forEach((v) => {
        setError(v.context, v.message, validationErrors, errors);
    });

    const validations = setValidations(data, validationErrors);

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

function isObject(o: any) {
    return Object.prototype.toString.call(o) === '[object Object]';
}
