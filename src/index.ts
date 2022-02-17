import { getType } from 'mobx-state-tree';

function setError(paths: any, message: any, validations: any) {
    if (paths.length && !paths[0].path) {
        setError(paths.slice(1), message, validations);
    } else if (paths.length > 1) {
        validations[paths[0].path] = validations[paths[0].path] ? validations[paths[0].path] : {};
        setError(paths.slice(1), message, validations[paths[0].path]);
    } else {
        if (validations[paths[0].path] && validations[paths[0].path].messages) {
            validations[paths[0].path].messages.push(message);
            validations[paths[0].path].isValid = false;
        } else {
            validations[paths[0].path] = {
                messages: [message],
                isValid: false,
            };
        }
    }
}

function setValidationResult(data: any, validations: any) {
    for (let [key, value] of Object.entries(data)) {
        if (isObject(value)) {
            setValidationResult(data[key], validations[key]);
        } else {
            validations[key] =
                validations[key] !== undefined ? validations[key] : { isValid: true, messages: [] };
        }
    }
}

// TODO: Add overload for using either model or type
export function validate(model: any, data: any): any {
    const type = getType(model);
    const mstValidations = type.validate(data, [{ path: '', type }]);

    let validations = {};
    for (let validation of mstValidations) {
        setError(validation.context, validation.message, validations);
    }

    setValidationResult(data, validations);


    
    return {
        isValid: mstValidations.length ? false : true,
        validations,
    };
}

function isObject(o: any) {
    return Object.prototype.toString.call(o) === '[object Object]';
}
