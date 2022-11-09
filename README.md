# mst-validation

A validation library for mobx-state-tree.

# Installation

`npm install mobx mobx-state-tree mst-validation`

# Usage

```tsx
import { rules, validate } from 'mst-validation';

// Intersection type
const minLength = (min: number) =>
    types.refinement(
        types.string,
        (v) => v.length >= min,
        () => 'minLength'
    );
const maxLength = (max: number) =>
    types.refinement(
        types.string,
        (v) => v.length <= max,
        () => 'maxLength'
    );

const minOneMaxFive = rules.intersection(minLength(1), maxLength(5));

const { isValid, errors } = validate(minOneMaxFive, 'a long message');
expect(isValid).toBe(false);
expect(errors[0]).toBe('maxLength');

// Custom validation messages for all types
const min = (min: number) =>
    types.refinement(
        types.number,
        (v) => v >= min,
        () => 'minCount'
    );

const validators = {
    name: rules.validation(minLength(1), () => 'Invalid name'),
    age: rules.validation(min(0), () => 'Invalid age'),
};

// Validate models
const DogModel = types.model({
    name: validators.name,
    age: validators.age,
});

const UserModel = types.model({
    name: validators.name,
    age: validators.age,
    interests: types.string,
    dogs: types.array(DogModel),
});

const { isValid, errors, validations } = validate(UserModel, {
    name: Kim,
    age: 37,
    interests: 2,
    dogs: [{ name: '', age: 2 }],
});
expect(isValid).toBe(false);
expect(validations.dogs[0].name.isValid).toBe(false);
```
