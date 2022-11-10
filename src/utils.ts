import {
    isUnionType,
    isModelType,
    isReferenceType,
    isLateType,
    isOptionalType,
    isArrayType,
} from 'mobx-state-tree';

export function getSubType(t: any, data?: any): any {
    if (isUnionType(t)) {
        const actualType = t.determineType && data !== undefined && t.determineType(data);
        if (actualType) {
            return actualType;
        }
        if (!t.determineType) {
            return getSubType(t._subtype);
        }
        const subTypes = t._types.map((t: any) => getSubType(t, data));
        const modelWithProperties = subTypes.find((x: any) => isModelType(x) || isReferenceType(x));
        if (modelWithProperties) {
            return getSubType(modelWithProperties, data);
        }
        return t;
    } else if (isLateType(t)) {
        return getSubType((t as any).getSubType(), data);
    } else if (isOptionalType(t)) {
        return getSubType((t as any)._subtype, data);
    } else if (isArrayType(t)) {
        return getSubType((t as any)._subType, data);
    } else if (isReferenceType(t)) {
        return getSubType((t as any).targetType, data);
    } else {
        return t;
    }
}
