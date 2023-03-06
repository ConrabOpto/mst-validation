import { isObservableArray } from 'mobx';
import type { ValidationIssue, FormattedError } from '.';

function formatter(obj: any, paths: (string | number)[], result: any, issue: any): any {
    if (isObject(obj) && paths.length <= 1) {
        result._errors = [...(result._errors ?? []), issue];
        return;
    }
    
    const value = obj[paths[0]];
    if (isArray(value)) {
        result[paths[0]] = new Array(value.length).fill(undefined);
    } else if (isObject(value)) {
        result[paths[0]] = {};
    }

    return formatter(value, paths.slice(1), result[paths[0]], issue);
}

export function format<T>(data: T, issues: ValidationIssue[]): FormattedError<T> {
    let result: any = {};
    for (let issue of issues) {
        formatter(data, issue.path, result, issue);
    }
    return result;
}

function isArray(a: any) {
    return Array.isArray(a) || isObservableArray(a);
}

export function isObject(a: any) {
    return a && typeof a === 'object' && !isArray(a);
}