/* eslint-disable */
import * as types from './graphql.js';



const documents = {}
export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
