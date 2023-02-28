# mst-validation

A validation library for mobx-state-tree.

# Installation

`npm install mobx mobx-state-tree mst-validation`

# Usage

## Intersection type

```ts
import { rules, validate } from 'mst-validation';

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

const result = validate(minOneMaxFive, 'a long message');
expect(result.success).toBe(false);
expect(result.error.issues[0].code).toBe('intersection');
expect(result.error.issues[1].code).toBe('maxLength');
```

## Debugging

Error messages in mobx-state-tree can sometimes be difficult to read. With `validate` and you get
an object representation of where the errors happened, which can be easier to digest for complex models.

```ts
const DogModel = types.model({
    name: validators.name,
    age: validators.age,
});

const CatModel = types.model({
    name: validators.name,
    age: validators.age,
    breed: types.enumeration(['Abyssinian Cat', 'Bengal Cat']),
});

const UserModel = types.model({
    name: validators.name,
    age: validators.age,
    interests: rules.intersection(
        types.string,
        rules.validation(minLength(1), () => 'Not long enough')
    ),
    animals: types.array(types.union(CatModel, DogModel)),
});

const { success, issues } = validate(UserModel, {
    name: 'Kim',
    age: 37,
    interests: 2,
    animals: [
        { name: 'Mephisto', age: 3, breed: 'Bengal Cat' },
        { name: 'Catdog', breed: 'Golden retriever' },
        { name: 'Eddie', age: 4 },
    ],
});
