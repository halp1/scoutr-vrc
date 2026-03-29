
# MatchObj


## Properties

Name | Type
------------ | -------------
`id` | number
`event` | [IdInfo](IdInfo.md)
`division` | [IdInfo](IdInfo.md)
`round` | number
`instance` | number
`matchnum` | number
`scheduled` | Date
`started` | Date
`field` | string
`scored` | boolean
`name` | string
`alliances` | [Array&lt;Alliance&gt;](Alliance.md)

## Example

```typescript
import type { MatchObj } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "event": null,
  "division": null,
  "round": null,
  "instance": null,
  "matchnum": null,
  "scheduled": null,
  "started": null,
  "field": null,
  "scored": null,
  "name": null,
  "alliances": null,
} satisfies MatchObj

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MatchObj
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


