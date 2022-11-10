import { types } from 'mobx-state-tree';
import { test, expect } from 'vitest';
import { rules, validateType, withValidation } from '../src/';

const min = (min: number) =>
    types.refinement(
        types.number,
        (v) => v >= min,
        () => 'min'
    );
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

test('basic validation', () => {
    const Model = types
        .model({
            age: types.refinement(
                types.number,
                (v) => v > 0,
                () => 'Is not a valid age'
            ),
            pets: types.number,
            name: types.string,
        })
        .extend(withValidation())
        .actions((self) => ({
            setAge(age: number) {
                self.age = age;
            },
        }));

    const m = Model.create({ age: 4, name: 'test', pets: 2 });
    expect(m.validation.isValid).toBe(true);
    m.validate({ age: -2, name: 'kim', pets: 'dog' });
    expect(m.validation.isValid).toBe(false);
    expect(m.validation.fields.age.isValid).toBe(false);
    expect(m.validation.fields.age.errors[0]).toBe('Is not a valid age');
    expect(m.validation.fields.pets.errors[0]).toBe('Value is not a number');
    expect(m.validation.errors).toEqual(['Is not a valid age', 'Value is not a number']);
});

test('nested model', () => {
    const Model = types.model({
        l1: types.model({
            l2: types.model({
                l3: types.model({
                    l4: types.model({
                        name: rules.validation(types.string, 'name'),
                    }),
                }),
            }),
        }),
        age: types.maybe(types.number),
    });

    const { fields, errors } = validateType(Model, {
        age: 4,
        l1: { l2: { l3: { l4: { name: 4 } } } },
    });
    expect(fields.l1.l2.l3.l4.name.isValid).toBe(false);
    expect(fields.l1.l2.l3.l4.name.value).toBe(4);
    expect(fields.l1.l2.l3.l4.name.errors[0]).toBe('name');
    expect(fields.age.isValid).toBe(true);
    expect(errors).toEqual(['name']);
});

test('primitive type', () => {
    const t = types.union(types.string, types.undefined);
    const union = validateType(t, null);
    expect(union.isValid).toBe(false);
    expect(union.errors).toEqual([
        'No type is applicable for the union',
        'Value is not a string',
        'Value is not a undefined',
    ]);

    const i = rules.intersection(minLength(1), maxLength(5));
    const intersection = validateType(i, '2222222222');
    expect(intersection.errors[0]).toBe('maxLength');
});

test('model', () => {
    const validators = {
        name: rules.validation(minLength(1), () => 'Invalid name'),
        age: rules.validation(min(0), () => 'Invalid age'),
    };

    // Validate models
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
        dogs: types.array(types.late(() => DogModel)),
        animals: types.array(types.union(CatModel, DogModel)),
        dog: types.maybe(types.reference(DogModel)),
    });

    const { isValid, errors, fields } = validateType(UserModel, {
        name: 'Kim',
        age: 37,
        interests: 2,
        dogs: [
            { name: '', age: 2 },
            { name: 'Eddie', age: 4 },
        ],
        animals: [
            { name: 'Mephisto', age: 3, breed: 'Bengal Cat' },
            { name: 'Catdog', breed: 'Golden retriever' },
            { name: 'Eddie', age: 4 },
        ],
    });

    expect(isValid).toBe(false);
    expect(errors).toEqual([
        'Value is not a string',
        'Not long enough',
        'Invalid name',
        'No type is applicable for the union',
        'Invalid age',
        'No type is applicable for the union',
        'Value is not a literal "Abyssinian Cat"',
        'Value is not a literal "Bengal Cat"',
        'Invalid age',
    ]);
    expect(fields).toEqual({
        interests: {
            isValid: false,
            errors: ['Value is not a string', 'Not long enough'],
            value: 2,
        },
        dogs: [
            {
                name: {
                    isValid: false,
                    errors: ['Invalid name'],
                    value: '',
                },
                age: {
                    isValid: true,
                    errors: [],
                    value: 2,
                },
            },
            {
                name: {
                    isValid: true,
                    errors: [],
                    value: 'Eddie',
                },
                age: {
                    isValid: true,
                    errors: [],
                    value: 4,
                },
            },
        ],
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
        dog: {
            isValid: true,
            errors: [],
            value: undefined,
        },
    });
});
