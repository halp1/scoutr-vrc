
# PaginatedProgram


## Properties

Name | Type
------------ | -------------
`meta` | [PageMeta](PageMeta.md)
`data` | [Array&lt;Program&gt;](Program.md)

## Example

```typescript
import type { PaginatedProgram } from ''

// TODO: Update the object below with actual values
const example = {
  "meta": null,
  "data": null,
} satisfies PaginatedProgram

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PaginatedProgram
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


