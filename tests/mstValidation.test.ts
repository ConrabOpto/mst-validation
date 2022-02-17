import { types } from 'mobx-state-tree';
import { validate } from '../src/';

test('basic validation', () => {
    const Model = types.model({
        age: types.refinement(types.number, () => true, () => 'Not a number'),
        name: types.string,
    });
    const m = Model.create({ age: 4, name: 'test' });
    const { validations, isValid } = validate(m, { age: 'ba', name: 'test2' });
    expect(isValid).toBe(false);
    expect(validations.age.isValid).toBe(false);
    expect(validations.age.messages[0]).toBe('Value is not a number');
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
