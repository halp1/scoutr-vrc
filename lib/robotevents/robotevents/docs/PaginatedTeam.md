
# PaginatedTeam


## Properties

Name | Type
------------ | -------------
`meta` | [PageMeta](PageMeta.md)
`data` | [Array&lt;Team&gt;](Team.md)

## Example

```typescript
import type { PaginatedTeam } from ''

// TODO: Update the object below with actual values
const example = {
  "meta": null,
  "data": null,
} satisfies PaginatedTeam

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PaginatedTeam
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


