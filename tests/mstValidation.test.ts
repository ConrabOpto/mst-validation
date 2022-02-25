import { applySnapshot, getSnapshot, SnapshotIn, types } from 'mobx-state-tree';
import { validate, rules } from '../src/';

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
        .actions((self) => ({
            setAge(age: number) {
                self.age = age;
            },
        }));

    const m = Model.create({ age: 4, name: 'test', pets: 2 });
    const { validations, isValid } = validate(m, { age: -2, name: 'kim', pets: 'dog' });

    expect(isValid).toBe(false);
    expect(validations.age.isValid).toBe(false);
    expect(validations.age.errors[0]).toBe('Is not a valid age');
    expect(validations.pets.errors[0]).toBe('Value is not a number');
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

    const m = Model.create({ l1: { l2: { l3: { l4: { name: 'test' } } } } });
    const { validations } = validate(m, { age: 4, l1: { l2: { l3: { l4: { name: 4 } } } } });
    expect(validations.l1.l2.l3.l4.name.isValid).toBe(false);
    expect(validations.l1.l2.l3.l4.name.errors[0]).toBe('name');
    expect(validations.age.isValid).toBe(true);
});

test('primitive type', () => {
    const t = types.union(types.string, types.undefined);
    const union = validate(t, null);
    expect(union.isValid).toBe(false);
    expect(union.validations.errors).toEqual([
        'No type is applicable for the union',
        'Value is not a string',
        'Value is not a undefined',
    ]);

    const i = rules.intersection<string>(minLength(1), maxLength(5));
    const intersection = validate(i, '2222222222');
    expect(intersection.errors[0]).toBe('maxLength');
});

test('basic form', () => {
    const UserModel = types.model({
        age: rules.validation(rules.intersection(types.integer, min(0)), 'Not a valid age'),
    });

    const Field = types.model({
        errors: types.array(types.string),
        isValid: true,
    });
    const Input = Field.named('Input')
        .props({
            value: '',
        })
        .actions((self) => ({
            setValue(value: string) {
                self.value = value;
            },
        }));
    const IntegerInput = Input.named('IntegerInput')
        .preProcessSnapshot((snapshot: SnapshotIn<typeof Input>) => {
            return {
                value: `${snapshot.value}`,
                isValid: snapshot.isValid,
                errors: snapshot.errors,
            };
        })
        .postProcessSnapshot((snapshot) => {
            const parsed = parseInt(snapshot.value, 0);
            return Number.isInteger(parsed) ? parsed : snapshot.value;
        });
    const FormModel = types.model('FormModel', {}).views((self) => ({
        get isValid() {
            return Object.values(self).every((v) => v.isValid);
        },
    })).actions(self => ({
        init(data: any) {
            let snapshot: any = {};
            for (let [key, value] of Object.entries(data)) {
                snapshot[key] = { value, isValid: true, errors: [] };
            }    
            applySnapshot(self, snapshot);
        }
    }))

    const UserFormModel = FormModel.named('UserFormModel')
        .props({
            age: types.optional(IntegerInput, {}),
        })
        .actions((self) => ({
            validate() {
                const { validations } = validate(UserModel, getSnapshot(self));
                applySnapshot(self, validations);
            },
        }));

    const user = UserModel.create({ age: 4 });
    const form = UserFormModel.create();
    form.init(user);
    form.validate();

    form.age.setValue('a');
    form.validate();

    expect(form.isValid).toBe(false);

    form.age.setValue('9');
    form.validate();

    expect(form.isValid).toBe(true);
    applySnapshot(user, getSnapshot(form));
    expect(user.age).toBe(9);
});
