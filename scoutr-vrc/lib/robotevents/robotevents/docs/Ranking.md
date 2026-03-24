
# Ranking


## Properties

Name | Type
------------ | -------------
`id` | number
`event` | [IdInfo](IdInfo.md)
`division` | [IdInfo](IdInfo.md)
`rank` | number
`team` | [IdInfo](IdInfo.md)
`wins` | number
`losses` | number
`ties` | number
`wp` | number
`ap` | number
`sp` | number
`highScore` | number
`averagePoints` | number
`totalPoints` | number

## Example

```typescript
import type { Ranking } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "event": null,
  "division": null,
  "rank": null,
  "team": null,
  "wins": null,
  "losses": null,
  "ties": null,
  "wp": null,
  "ap": null,
  "sp": null,
  "highScore": null,
  "averagePoints": null,
  "totalPoints": null,
} satisfies Ranking

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Ranking
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


