export function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
	return array.reduce((sum, item) => sum + iteratee(item), 0);
}
