# mst-validation

A validation library for mobx-state-tree.

# Installation

`npm install mobx mobx-state-tree mst-validation`

# Example

[Basic example](https://codesandbox.io/s/mst-validation-onceye?file=/src/App.tsx)

# Usage

## createValidator

```tsx
const UserModel = types
    .model({
        name: types.string,
        age: types.number,
    });

export default observer(function App() {
    const [validator] = useState(() => createValidator(UserModel));
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const validateUser = () => {
        validator.validate({
            name: name,
            age: parseInt(age, 10),
        });
    };
    return (
        <div>
            <div>
                <span>Name</span>
                <input
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    onBlur={() => validateUser()}
                />
                {!validator.fields.name.isValid && (
                    <div style={{ color: 'red' }}>{validator.fields.name.errors[0]}</div>
                )}
            </div>
            <div>
                <span>Age</span>
                <input
                    value={age}
                    onChange={(ev) => setAge(ev.target.value)}
                    onBlur={() => validateUser()}
                />
                {!validator.fields.age.isValid && (
                    <div style={{ color: 'red' }}>{validator.fields.age.errors[0]}</div>
                )}
            </div>
        </div>
    );
});
```

## Intersection type

```ts
import { rules, validateType } from 'mst-validation';

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

const { isValid, errors } = validateType(minOneMaxFive, 'a long message');
expect(isValid).toBe(false);
expect(errors[0]).toBe('maxLength');
```

## Custom validation messages

```ts
const min = (min: number) =>
    types.refinement(
        types.number,
        (v) => v >= min
    );

const validators = {
    name: rules.validation(minLength(1), () => 'Invalid name'),
    age: rules.validation(min(0), () => 'Invalid age'),
};

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

const { isValid, errors, validations } = validateType(UserModel, {
    name: 'Kim',
    age: 37,
    interests: 2,
    dogs: [{ name: '', age: 2 }],
});
expect(validations.dogs[0].name.errors[0]).toBe('Invalid name');
```

## Debugging

Error messages in mobx-state-tree can sometimes be difficult to read. With `validate` and `validateType` you get
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

const { isValid, errors, fields } = validateType(UserModel, {
    name: 'Kim',
    age: 37,
    interests: 2,
    animals: [
        { name: 'Mephisto', age: 3, breed: 'Bengal Cat' },
        { name: 'Catdog', breed: 'Golden retriever' },
        { name: 'Eddie', age: 4 },
    ],
});

expect(fields).toEqual({
    interests: {
        isValid: false,
        errors: ['Value is not a string', 'Not long enough'],
        value: 2,
    },
    name: {
        isValid: true,
        errors: [],
        value: 'Kim',
    },
    age: {
        isValid: true,
        errors: [],
        value: 37,
    },
    animals: [
        {
            name: { isValid: true, errors: [], value: 'Mephisto' },
            age: { isValid: true, errors: [], value: 3 },
            breed: { isValid: true, errors: [], value: 'Bengal Cat' },
        },
        {
            age: { isValid: false, errors: ['Invalid age'], value: undefined },
            name: { isValid: true, errors: [], value: 'Catdog' },
            breed: { isValid: true, errors: [], value: 'Golden retriever' },
        },
        {
            name: { isValid: true, errors: [], value: 'Eddie' },
            age: { isValid: true, errors: [], value: 4 },
        },
    ],
});
```
