
# Award


## Properties

Name | Type
------------ | -------------
`id` | number
`event` | [IdInfo](IdInfo.md)
`order` | number
`title` | string
`qualifications` | Array&lt;string&gt;
`designation` | string
`classification` | string
`teamWinners` | [Array&lt;TeamAwardWinner&gt;](TeamAwardWinner.md)
`individualWinners` | Array&lt;string&gt;

## Example

```typescript
import type { Award } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "event": null,
  "order": null,
  "title": null,
  "qualifications": null,
  "designation": null,
  "classification": null,
  "teamWinners": null,
  "individualWinners": null,
} satisfies Award

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Award
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


