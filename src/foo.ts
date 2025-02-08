// type State<S, A> = (s: S) => [A, S];
//
// const addIngredient =
//     (ingredient: string): State<string[], void> =>
//     (currentContents: string[]) => [
//         undefined,
//         [...currentContents, ingredient],
//     ];
//
// const get =
//     <S>(): State<S, S> =>
//     (s: S) => [s, s];
//
// const put =
//     <S>(newState: S): State<S, void> =>
//     (_: S) => [undefined, newState];
//
// const flatMap =
//     <S, A, B>(m: State<S, A>, f: (a: A) => State<S, B>): State<S, B> =>
//     (s: S) => {
//         const [a, s1] = m(s);
//         return f(a)(s1);
//     };
//
// const cookRecipe: State<string[], string> = flatMap(
//     addIngredient("onions"),
//     () =>
//         flatMap(addIngredient("tomatoes"), () =>
//             flatMap(addIngredient("spices"), () =>
//                 flatMap(get<string[]>(), (finalContents) => (s: string[]) => [
//                     `Cooked: ${finalContents.join(", ")}`,
//                     s,
//                 ]),
//             ),
//         ),
// );
//
// console.log(cookRecipe([]));
// Output: ['Cooked: onions, tomatoes, spices', ['onions', 'tomatoes', 'spices']]
type StateMonad<S, A> = (state: S) => [A, S];

class State<S, A> {
    constructor(public run: StateMonad<S, A>) {}

    // map :: (A -> B) -> State S A -> State S B
    map<B>(f: (a: A) => B): State<S, B> {
        return new State((s) => {
            const [a, newState] = this.run(s);
            return [f(a), newState];
        });
    }

    // flatMap :: (A -> State S B) -> State S A -> State S B
    flatMap<B>(f: (a: A) => State<S, B>): State<S, B> {
        return new State((s) => {
            const [a, intermediateState] = this.run(s);
            return f(a).run(intermediateState);
        });
    }

    // pure :: A -> State S A
    static pure<S, A>(a: A): State<S, A> {
        return new State((s) => [a, s]);
    }

    // get :: State S S
    static get<S>(): State<S, S> {
        return new State((s) => [s, s]);
    }

    // put :: S -> State S void
    static put<S>(newState: S): State<S, void> {
        return new State((_) => [undefined, newState]);
    }

    // modify :: (S -> S) -> State S void
    static modify<S>(f: (s: S) => S): State<S, void> {
        return new State((s) => [undefined, f(s)]);
    }

    static of<S, A>(a: A): State<S, A> {
        return State.pure(a);
    }

    static sequence<S, A>(states: State<S, A>[]): State<S, A[]> {
        return states.reduce(
            (acc, state) =>
                acc.flatMap((results) => state.map((a) => [...results, a])),
            State.pure<S, A[]>([]),
        );
    }

    static traverse<S, A, B>(
        arr: A[],
        f: (a: A) => State<S, B>,
    ): State<S, B[]> {
        return State.sequence(arr.map(f));
    }

    static chain<S>(...operations: ((s: S) => State<S, any>)[]): State<S, any> {
        return operations.reduce((acc, op) => {
            return acc.flatMap((_) => State.get<S>().flatMap(op));
        }, State.of<S, any>(undefined));
    }
}

type GameState = {
    health: number;
    gold: number;
    level: number;
};

const increaseHealth = (amount: number): State<GameState, void> =>
    State.modify((s) => ({ ...s, health: Math.min(s.health + amount, 100) }));

const earnGold = (amount: number): State<GameState, void> =>
    State.modify((s) => ({ ...s, gold: s.gold + amount }));

const levelUp = (): State<GameState, void> =>
    State.modify((s) => ({ ...s, level: s.level + 1, health: 100 }));

// With helper functions
const complexActionSimplified = State.chain<GameState>(
    (s) =>
        s.health < 50
            ? increaseHealth(20)
            : State.of<GameState, void>(undefined),
    (s) => earnGold(s.health < 50 ? 30 : 10),
    (s) => (s.gold >= 100 ? levelUp() : State.of<GameState, void>(undefined)),
);

// Using traverse
const applyUpgrades = (upgrades: string[]): State<GameState, void[]> =>
    State.traverse(upgrades, (upgrade) => {
        switch (upgrade) {
            case "health":
                return increaseHealth(10);
            case "gold":
                return earnGold(20);
            case "level":
                return levelUp();
            default:
                return State.of<GameState, void>(undefined);
        }
    });

// Usage
const initialState: GameState = { health: 40, gold: 80, level: 1 };
console.log(initialState);
const [_, finalState] = complexActionSimplified.run(initialState);
console.log(_, finalState);

const upgrades = ["health", "gold", "level"];
const [__, upgradedState] = applyUpgrades(upgrades).run(finalState);
console.log(upgradedState);
