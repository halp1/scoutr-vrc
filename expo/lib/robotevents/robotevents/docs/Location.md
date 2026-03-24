
# Location


## Properties

Name | Type
------------ | -------------
`venue` | string
`address1` | string
`address2` | string
`city` | string
`region` | string
`postcode` | string
`country` | string
`coordinates` | [Coordinates](Coordinates.md)

## Example

```typescript
import type { Location } from ''

// TODO: Update the object below with actual values
const example = {
  "venue": null,
  "address1": null,
  "address2": null,
  "city": null,
  "region": null,
  "postcode": null,
  "country": null,
  "coordinates": null,
} satisfies Location

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Location
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


