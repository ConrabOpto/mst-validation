import { types } from 'mobx-state-tree';
import { validate } from '../src/';

test('basic validation', () => {
    const Model = types.model({
        age: types.refinement(types.number, (v) => v >= 0, () => 'Not a valid age'),
        pets: types.number,
        name: types.string,
    });
    const m = Model.create({ age: 4, name: 'test', pets: 2 });
    const { validations, isValid } = validate(m, { age: -2, name: 'kim', pets: 'dog' });
    expect(isValid).toBe(false);
    expect(validations.age.isValid).toBe(false);
    expect(validations.age.messages[0]).toBe('Not a valid age');
    expect(validations.pets.messages[0]).toBe('Value is not a number');
});

test('nested model', () => {
    const Model = types.model({
        l1: types.model({
            l2: types.model({
                l3: types.model({
                    l4: types.model({
                        name: types.string,
                    }),
                }),
            }),
        }),
        age: types.maybe(types.number),
    });
    const m = Model.create({ l1: { l2: { l3: { l4: { name: 'test' }} } } });
    const { validations } = validate(m, { age: 4, l1: { l2: { l3: { l4: { name: 4 }} } } });
    expect(validations.l1.l2.l3.l4.name.isValid).toBe(false);
    expect(validations.l1.l2.l3.l4.name.messages[0]).toBe('Value is not a string');
    expect(validations.age.isValid).toBe(true);
});
