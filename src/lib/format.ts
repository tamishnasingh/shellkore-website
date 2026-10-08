export const num = (n: number) => Math.round(n).toLocaleString("en-IN");
export const inr = (n: number) => "₹" + num(n);
