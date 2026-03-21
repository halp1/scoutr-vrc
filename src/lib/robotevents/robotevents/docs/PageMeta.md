
# PageMeta


## Properties

Name | Type
------------ | -------------
`currentPage` | number
`firstPageUrl` | string
`from` | number
`lastPage` | number
`lastPageUrl` | string
`nextPageUrl` | string
`path` | string
`perPage` | number
`prevPageUrl` | string
`to` | number
`total` | number

## Example

```typescript
import type { PageMeta } from ''

// TODO: Update the object below with actual values
const example = {
  "currentPage": null,
  "firstPageUrl": null,
  "from": null,
  "lastPage": null,
  "lastPageUrl": null,
  "nextPageUrl": null,
  "path": null,
  "perPage": null,
  "prevPageUrl": null,
  "to": null,
  "total": null,
} satisfies PageMeta

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PageMeta
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


