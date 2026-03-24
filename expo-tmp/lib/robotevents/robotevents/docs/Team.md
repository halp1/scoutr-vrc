
# Team


## Properties

Name | Type
------------ | -------------
`id` | number
`number` | string
`teamName` | string
`robotName` | string
`organization` | string
`location` | [Location](Location.md)
`registered` | boolean
`program` | [IdInfo](IdInfo.md)
`grade` | [Grade](Grade.md)

## Example

```typescript
import type { Team } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "number": null,
  "teamName": null,
  "robotName": null,
  "organization": null,
  "location": null,
  "registered": null,
  "program": null,
  "grade": null,
} satisfies Team

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Team
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


