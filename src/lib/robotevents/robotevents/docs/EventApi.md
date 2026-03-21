# EventApi

All URIs are relative to *https://www.robotevents.com/api/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**eventGetAwards**](EventApi.md#eventgetawards) | **GET** /events/{id}/awards |  |
| [**eventGetDivisionFinalistRankings**](EventApi.md#eventgetdivisionfinalistrankings) | **GET** /events/{id}/divisions/{div}/finalistRankings |  |
| [**eventGetDivisionMatches**](EventApi.md#eventgetdivisionmatches) | **GET** /events/{id}/divisions/{div}/matches |  |
| [**eventGetDivisionRankings**](EventApi.md#eventgetdivisionrankings) | **GET** /events/{id}/divisions/{div}/rankings |  |
| [**eventGetEvent**](EventApi.md#eventgetevent) | **GET** /events/{id} |  |
| [**eventGetEvents**](EventApi.md#eventgetevents) | **GET** /events |  |
| [**eventGetSkills**](EventApi.md#eventgetskills) | **GET** /events/{id}/skills |  |
| [**eventGetTeams**](EventApi.md#eventgetteams) | **GET** /events/{id}/teams |  |



## eventGetAwards

> PaginatedAward eventGetAwards(id, team, winner)



Gets a List of Awards at a given Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetAwardsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
    // Array<number> | Filter by Team Number that the Award was awarded to (optional)
    team: ...,
    // Array<string> | Filter by the Winner of the Award (can include people\'s names, etc.) (optional)
    winner: ...,
  } satisfies EventGetAwardsRequest;

  try {
    const data = await api.eventGetAwards(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |
| **team** | `Array<number>` | Filter by Team Number that the Award was awarded to | [Optional] |
| **winner** | `Array<string>` | Filter by the Winner of the Award (can include people\&#39;s names, etc.) | [Optional] |

### Return type

[**PaginatedAward**](PaginatedAward.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A list of Awards |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetDivisionFinalistRankings

> PaginatedRanking eventGetDivisionFinalistRankings(id, div, team, rank)



Gets a List of Finalist Rankings for a single Division of an Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetDivisionFinalistRankingsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
    // number | The ID of the Division
    div: 56,
    // Array<number> | Filter to only return Rankings which involve given Teams (optional)
    team: ...,
    // Array<number> | Filter by the Rank (optional)
    rank: ...,
  } satisfies EventGetDivisionFinalistRankingsRequest;

  try {
    const data = await api.eventGetDivisionFinalistRankings(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |
| **div** | `number` | The ID of the Division | [Defaults to `undefined`] |
| **team** | `Array<number>` | Filter to only return Rankings which involve given Teams | [Optional] |
| **rank** | `Array<number>` | Filter by the Rank | [Optional] |

### Return type

[**PaginatedRanking**](PaginatedRanking.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A list of Rankings |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetDivisionMatches

> PaginatedMatch eventGetDivisionMatches(id, div, team, round, instance, matchnum)



Gets a List of Matches for a single Division of an Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetDivisionMatchesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
    // number | The ID of the Division
    div: 56,
    // Array<number> | Filter to only return Matches which involved given Teams (optional)
    team: ...,
    // Array<number> | Filter by the Round of the Match. Some typical values are shown below: - 1 - Practice - 2 - Qualification - 3 - Quarter-Finals - 4 - Semi-Finals - 5 - Finals - 6 - Round of 16 - etc.  (optional)
    round: ...,
    // Array<number> | Filter by the Instance of the Match. This is used to describe which Quarter-Final match (for example) is being played (optional)
    instance: ...,
    // Array<number> | Filter by the MatchNum of the Match. This is the actual Match \"number\", e.g. Qualification Match, or the individual match in a Best of 3 (optional)
    matchnum: ...,
  } satisfies EventGetDivisionMatchesRequest;

  try {
    const data = await api.eventGetDivisionMatches(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |
| **div** | `number` | The ID of the Division | [Defaults to `undefined`] |
| **team** | `Array<number>` | Filter to only return Matches which involved given Teams | [Optional] |
| **round** | `Array<number>` | Filter by the Round of the Match. Some typical values are shown below: - 1 - Practice - 2 - Qualification - 3 - Quarter-Finals - 4 - Semi-Finals - 5 - Finals - 6 - Round of 16 - etc.  | [Optional] |
| **instance** | `Array<number>` | Filter by the Instance of the Match. This is used to describe which Quarter-Final match (for example) is being played | [Optional] |
| **matchnum** | `Array<number>` | Filter by the MatchNum of the Match. This is the actual Match \&quot;number\&quot;, e.g. Qualification Match, or the individual match in a Best of 3 | [Optional] |

### Return type

[**PaginatedMatch**](PaginatedMatch.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A list of Matches |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetDivisionRankings

> PaginatedRanking eventGetDivisionRankings(id, div, team, rank)



Gets a List of Rankings for a single Division of an Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetDivisionRankingsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
    // number | The ID of the Division
    div: 56,
    // Array<number> | Filter to only return Rankings which involve given Teams (optional)
    team: ...,
    // Array<number> | Filter by the Rank (optional)
    rank: ...,
  } satisfies EventGetDivisionRankingsRequest;

  try {
    const data = await api.eventGetDivisionRankings(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |
| **div** | `number` | The ID of the Division | [Defaults to `undefined`] |
| **team** | `Array<number>` | Filter to only return Rankings which involve given Teams | [Optional] |
| **rank** | `Array<number>` | Filter by the Rank | [Optional] |

### Return type

[**PaginatedRanking**](PaginatedRanking.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A list of Rankings |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetEvent

> Event eventGetEvent(id)



Gets a Single Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetEventRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
  } satisfies EventGetEventRequest;

  try {
    const data = await api.eventGetEvent(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |

### Return type

[**Event**](Event.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A single Event |  -  |
| **404** | Specified Event not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetEvents

> PaginatedEvent eventGetEvents(id, sku, team, season, start, end, region, level, myEvents, eventTypes)



Gets a List of Events

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetEventsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // Array<number> | Filter by Event ID (optional)
    id: ...,
    // Array<string> | Filter by Event SKU (optional)
    sku: ...,
    // Array<number> | Filter by Teams that participated in the Event (optional)
    team: ...,
    // Array<number> | Filter by the Season that the Event belonged to (optional)
    season: ...,
    // Date | Filter by the Start Date of the Event (optional)
    start: 2013-10-20T19:20:30+01:00,
    // Date | Filter by the End Date of the Event (optional)
    end: 2013-10-20T19:20:30+01:00,
    // string | Filter by the region of the event (optional)
    region: region_example,
    // Array<'World' | 'National' | 'State' | 'Signature' | 'Other'> | Filter by the Event Level (optional)
    level: ...,
    // boolean | Only show events that have at least one registered team associated with the authenticated user. (optional)
    myEvents: true,
    // Array<EventType> | Filter by the Event Type (optional)
    eventTypes: ...,
  } satisfies EventGetEventsRequest;

  try {
    const data = await api.eventGetEvents(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `Array<number>` | Filter by Event ID | [Optional] |
| **sku** | `Array<string>` | Filter by Event SKU | [Optional] |
| **team** | `Array<number>` | Filter by Teams that participated in the Event | [Optional] |
| **season** | `Array<number>` | Filter by the Season that the Event belonged to | [Optional] |
| **start** | `Date` | Filter by the Start Date of the Event | [Optional] [Defaults to `undefined`] |
| **end** | `Date` | Filter by the End Date of the Event | [Optional] [Defaults to `undefined`] |
| **region** | `string` | Filter by the region of the event | [Optional] [Defaults to `undefined`] |
| **level** | `World`, `National`, `State`, `Signature`, `Other` | Filter by the Event Level | [Optional] [Enum: World, National, State, Signature, Other] |
| **myEvents** | `boolean` | Only show events that have at least one registered team associated with the authenticated user. | [Optional] [Defaults to `false`] |
| **eventTypes** | `Array<EventType>` | Filter by the Event Type | [Optional] |

### Return type

[**PaginatedEvent**](PaginatedEvent.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of Events |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetSkills

> PaginatedSkill eventGetSkills(id, team, type)



Gets a List of Skills runs performed at a given Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetSkillsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
    // Array<number> | Filter by Team Number that performed the Skills run (optional)
    team: ...,
    // Array<'driver' | 'programming'> | Filter by Type of Skills run (optional)
    type: ...,
  } satisfies EventGetSkillsRequest;

  try {
    const data = await api.eventGetSkills(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |
| **team** | `Array<number>` | Filter by Team Number that performed the Skills run | [Optional] |
| **type** | `driver`, `programming` | Filter by Type of Skills run | [Optional] [Enum: driver, programming] |

### Return type

[**PaginatedSkill**](PaginatedSkill.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A list of Skills |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## eventGetTeams

> PaginatedTeam eventGetTeams(id, number, registered, grade, country, myTeams)



Gets a List of Teams present at a given Event

### Example

```ts
import {
  Configuration,
  EventApi,
} from '';
import type { EventGetTeamsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventApi(config);

  const body = {
    // number | The ID of the Event
    id: 56,
    // Array<string> | Filter by Team Number (optional)
    number: ...,
    // boolean | Filter by whether the Team is Registered (optional)
    registered: true,
    // Array<'College' | 'High School' | 'Middle School' | 'Elementary School'> | Filter by the Grade of the Team (optional)
    grade: ...,
    // Array<string> | Filter by the Country of the Team (optional)
    country: ...,
    // boolean | Only show teams associated with the authenticated user. (optional)
    myTeams: true,
  } satisfies EventGetTeamsRequest;

  try {
    const data = await api.eventGetTeams(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` | The ID of the Event | [Defaults to `undefined`] |
| **number** | `Array<string>` | Filter by Team Number | [Optional] |
| **registered** | `boolean` | Filter by whether the Team is Registered | [Optional] [Defaults to `undefined`] |
| **grade** | `College`, `High School`, `Middle School`, `Elementary School` | Filter by the Grade of the Team | [Optional] [Enum: College, High School, Middle School, Elementary School] |
| **country** | `Array<string>` | Filter by the Country of the Team | [Optional] |
| **myTeams** | `boolean` | Only show teams associated with the authenticated user. | [Optional] [Defaults to `false`] |

### Return type

[**PaginatedTeam**](PaginatedTeam.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of Teams |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

