
# Season


## Properties

Name | Type
------------ | -------------
`id` | number
`name` | string
`program` | [IdInfo](IdInfo.md)
`start` | Date
`end` | Date
`yearsStart` | number
`yearsEnd` | number

## Example

```typescript
import type { Season } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "program": null,
  "start": null,
  "end": null,
  "yearsStart": null,
  "yearsEnd": null,
} satisfies Season

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Season
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


