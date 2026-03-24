
# Event


## Properties

Name | Type
------------ | -------------
`id` | number
`sku` | string
`name` | string
`start` | Date
`end` | Date
`season` | [IdInfo](IdInfo.md)
`program` | [IdInfo](IdInfo.md)
`location` | [Location](Location.md)
`locations` | Array&lt;{ [key: string]: Location; }&gt;
`divisions` | [Array&lt;Division&gt;](Division.md)
`level` | [EventLevel](EventLevel.md)
`ongoing` | boolean
`awardsFinalized` | boolean
`eventType` | [EventType](EventType.md)

## Example

```typescript
import type { Event } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sku": null,
  "name": null,
  "start": null,
  "end": null,
  "season": null,
  "program": null,
  "location": null,
  "locations": null,
  "divisions": null,
  "level": null,
  "ongoing": null,
  "awardsFinalized": null,
  "eventType": null,
} satisfies Event

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Event
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


