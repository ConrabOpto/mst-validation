import { test, expect } from 'vitest';
import { types } from 'mobx-state-tree';
import { parse, rules, validationIssueCode } from '../src/';

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

function isFalse(value: boolean): asserts value is false {
    expect(value).toBe(false);
}

test('basic validation', () => {
    const Model = types
        .model({
            age: types.refinement(
                types.number,
                (v) => v > 0,
                () => 'age'
            ),
            pets: types.number,
            name: types.string,
        })
        .actions((self) => ({
            setAge(age: number) {
                self.age = age;
            },
        }));

    const result = parse(Model, { age: -2, name: 'kim', pets: 'dog' });
    isFalse(result.success);
    expect(result.error.issues[0].code).toBe('age');
    expect(result.error.issues[1].code).toBe('number');
});

test('nested model', () => {
    const Model = types.model({
        l1: types.model({
            l2: types.model({
                l3: types.model({
                    l4: types.model({
                        name: types.string
                    }),
                }),
            }),
        }),
        age: types.maybe(types.number),
    });

    const result = parse(Model, {
        age: 4,
        l1: { l2: { l3: { l4: { name: 4 } } } },
    });
    isFalse(result.success);
    expect(result.error.issues[0].path).toEqual(['l1', 'l2', 'l3', 'l4', 'name']);
});

test('primitive type', () => {
    const t = types.union(types.string, types.undefined);
    const union = parse(t, null);
    isFalse(union.success);
    expect(union.error.issues.map(i => i.code)).toEqual([
        validationIssueCode.union.code,
        validationIssueCode.string.code,
        validationIssueCode.undefined.code
    ]);

    const i = rules.intersection(minLength(1), maxLength(5));
    const intersection = parse(i, '2222222222');
    isFalse(intersection.success);
    expect(intersection.error.issues.map(i => i.code)).toEqual([
        'intersection',
        'maxLength'
    ]);

    const i2 = rules.intersection(types.string, minLength(1));
    const intersection2 = parse(i2, 4);
    isFalse(intersection2.success);
    expect(intersection2.error.issues.length).toBe(3);
});

test.only('model', () => {
    // parse models
    const DogModel = types.model({
        name: types.string,
        age: types.number,
    });

    const CatModel = types.model({
        name: types.string,
        age: types.number,
        breed: types.enumeration(['Abyssinian Cat', 'Bengal Cat']),
    });

    const UserModel = types.model({
        name: types.string,
        age: types.number,
        interests: rules.intersection(types.string, minLength(1)),
        dogs: types.array(types.late(() => DogModel)),
        animals: types.array(types.union(CatModel, DogModel)),
        dog: types.maybe(types.reference(DogModel)),
    });

    const result = parse(UserModel, {
        name: 'Kim',
        age: 37,
        interests: '',
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

    expect(result.success).toBe(false);
    if (result.success) {
        return;
    }
    expect(result.error.issues[0].code).toBe(validationIssueCode.intersection.code);
});

test('Custom Date', () => {
    const CustomDate = types.custom<string, Date | string>({
        name: 'CustomDate',
        fromSnapshot(value) {
            const d =
                /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(?:([\+-])(\d{2})\:(\d{2}))?Z?$/.exec(
                    value
                ) as any[];
            return new Date(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);
        },
        toSnapshot(value: Date) {
            if (value === undefined || value === null) {
                return value;
            }
            const tzoffset = value.getTimezoneOffset() * 60000;
            const localISOTime = new Date(value.getTime() - tzoffset).toISOString().slice(0, -1);
            return localISOTime;
        },
        isTargetType(v: string | Date): boolean {
            return v instanceof Date;
        },
        getValidationMessage(value: string) {
            const d =
                /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(?:([\+-])(\d{2})\:(\d{2}))?Z?$/.exec(
                    value
                ) as any[];
            if (d) {
                return '';
            }
            return 'Not a correct date';
        },
    });

    const DateModel = types.model({
        date: CustomDate,
    });

    const result = parse(DateModel, { date: 2 });
    expect(result.success).toBe(false);
    if (result.success) {
        return;
    }
    expect(result.error.issues[0].code).toBe('Not a correct date');
});
