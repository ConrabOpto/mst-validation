// TODO: Format output

// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// type Validation<Type> = Expand<{
//     isValid: boolean;
//     errors: string[];
//     value: Type;
// }>;

// type ValidationObject<Type> = Expand<{
//     [Key in keyof Omit<Type, symbol>]: Type[Key] extends Array<infer ArrayType>
//         ? Array<Expand<ValidationObject<ArrayType>>>
//         : Type[Key] extends object
//         ? Expand<ValidationObject<Type[Key]>>
//         : Validation<Type[Key]>;
// }>;

// export type FieldValidations<Type> = ValidationObject<SnapshotOut<Type>>;

// let validationErrors: any = {};
// let errors: string[] = [];
// mstValidations.forEach((v) => {
//     setError(v.context, v.message, validationErrors);
//     if (v.message) {
//         errors.push(...getErrors([], v.message));
//     }
// });
// const fields = setValidations(type, data, validationErrors);

// function getErrors(errors: undefined | any[], errorMessage: string) {
//     return [...(errors ?? []), getErrorMessages(errorMessage)].flat().filter(Boolean);
// }

// function setError(paths: any, message: any, validationLevel: any) {
//     const path = paths[0].path;
//     const type = paths[0].type;
//     if (isArrayType(type)) {
//         validationLevel[path] = [];
//     }
//     if (!path && paths.length === 1) {
//         const errors = getErrors(validationLevel.errors, message);
//         validationLevel.isValid = false;
//         validationLevel.errors = errors;
//     } else if (!path && paths.length > 1) {
//         setError(paths.slice(1), message, validationLevel);
//     } else if (paths.length > 1) {
//         if (Array.isArray(validationLevel[path])) {
//             validationLevel[path].push({});
//             setError(paths.slice(1), message, validationLevel[path]);
//         } else {
//             validationLevel[path] = validationLevel[path] ?? {};
//             setError(paths.slice(1), message, validationLevel[path]);
//         }
//     } else {
//         const errors = getErrors(validationLevel.errors, message);
//         validationLevel[path] = { isValid: false, errors };
//     }
// }

// function setValidations(type: any, data: any, validations: any = {}): any {
//     if (isArrayType(type)) {
//         return !Array.isArray(data)
//             ? []
//             : data.map((d: any, index: any) =>
//                   setValidations(getSubType(type, d), d, validations[index])
//               );
//     }
//     if (!type.properties) {
//         return validations?.errors
//             ? { ...validations, value: data }
//             : { isValid: true, errors: [], value: data };
//     }
//     for (let [key] of Object.entries(type.properties)) {
//         validations[key] = setValidations(type.properties[key], data?.[key], validations[key]);
//     }
//     return validations;
// }
