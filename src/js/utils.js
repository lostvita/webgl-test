export const randomColor = () => {
    const random =  Math.random
    return {
        r: random() * 255,
        g: random() * 255,
        b: random() * 255,
        a: random() * 1
    }
}