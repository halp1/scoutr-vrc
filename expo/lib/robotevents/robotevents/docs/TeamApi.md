# TeamApi

All URIs are relative to *https://www.robotevents.com/api/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**teamGetAwards**](TeamApi.md#teamgetawards) | **GET** /teams/{id}/awards |  |
| [**teamGetEvents**](TeamApi.md#teamgetevents) | **GET** /teams/{id}/events |  |
| [**teamGetMatches**](TeamApi.md#teamgetmatches) | **GET** /teams/{id}/matches |  |
| [**teamGetRankings**](TeamApi.md#teamgetrankings) | **GET** /teams/{id}/rankings |  |
| [**teamGetSkills**](TeamApi.md#teamgetskills) | **GET** /teams/{id}/skills |  |
| [**teamGetTeam**](TeamApi.md#teamgetteam) | **GET** /teams/{id} |  |
| [**teamGetTeams**](TeamApi.md#teamgetteams) | **GET** /teams |  |



## teamGetAwards

> PaginatedAward teamGetAwards(id, event, season)



Gets a List of Awards that a given Team has received

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetAwardsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // number | The ID of the Team
    id: 56,
    // Array<number> | Filter by the Event at which the Award was given out (optional)
    event: ...,
    // Array<number> | Filter by the Season in which the Award was given out (optional)
    season: ...,
  } satisfies TeamGetAwardsRequest;

  try {
    const data = await api.teamGetAwards(body);
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
| **id** | `number` | The ID of the Team | [Defaults to `undefined`] |
| **event** | `Array<number>` | Filter by the Event at which the Award was given out | [Optional] |
| **season** | `Array<number>` | Filter by the Season in which the Award was given out | [Optional] |

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
| **200** | List of Awards |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## teamGetEvents

> PaginatedEvent teamGetEvents(id, sku, season, start, end, level)



Gets a List of Events that a given Team has attended

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetEventsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // number | The ID of the Team
    id: 56,
    // Array<string> | Filter by Event SKU (optional)
    sku: ...,
    // Array<number> | Filter by the Season that the Event belonged to (optional)
    season: ...,
    // Date | Filter by the Start Date of the Event (optional)
    start: 2013-10-20T19:20:30+01:00,
    // Date | Filter by the End Date of the Event (optional)
    end: 2013-10-20T19:20:30+01:00,
    // Array<'World' | 'National' | 'State' | 'Signature' | 'Other'> | Filter by the Event Level (optional)
    level: ...,
  } satisfies TeamGetEventsRequest;

  try {
    const data = await api.teamGetEvents(body);
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
| **id** | `number` | The ID of the Team | [Defaults to `undefined`] |
| **sku** | `Array<string>` | Filter by Event SKU | [Optional] |
| **season** | `Array<number>` | Filter by the Season that the Event belonged to | [Optional] |
| **start** | `Date` | Filter by the Start Date of the Event | [Optional] [Defaults to `undefined`] |
| **end** | `Date` | Filter by the End Date of the Event | [Optional] [Defaults to `undefined`] |
| **level** | `World`, `National`, `State`, `Signature`, `Other` | Filter by the Event Level | [Optional] [Enum: World, National, State, Signature, Other] |

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


## teamGetMatches

> PaginatedMatch teamGetMatches(id, event, season, round, instance, matchnum)



Gets a List of Matches that a given Team has played in

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetMatchesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // number | The ID of the Team
    id: 56,
    // Array<number> | Filter by the Event the Match was performed at (optional)
    event: ...,
    // Array<number> | Filter by the Season during which the Match was played (optional)
    season: ...,
    // Array<number> | Filter by the Round of the Match. Some typical values are shown below: - 1 - Practice - 2 - Qualification - 3 - Quarter-Finals - 4 - Semi-Finals - 5 - Finals - 6 - Round of 16 - etc.  (optional)
    round: ...,
    // Array<number> | Filter by the Instance of the Match. This is used to describe which Quarter-Final match (for example) is being played (optional)
    instance: ...,
    // Array<number> | Filter by the MatchNum of the Match. This is the actual Match \"number\", e.g. Qualification Match, or the individual match in a Best of 3 (optional)
    matchnum: ...,
  } satisfies TeamGetMatchesRequest;

  try {
    const data = await api.teamGetMatches(body);
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
| **id** | `number` | The ID of the Team | [Defaults to `undefined`] |
| **event** | `Array<number>` | Filter by the Event the Match was performed at | [Optional] |
| **season** | `Array<number>` | Filter by the Season during which the Match was played | [Optional] |
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
| **200** | List of Matches |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## teamGetRankings

> PaginatedRanking teamGetRankings(id, event, rank, season)



Gets a List of Rankings for a given Team

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetRankingsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // number | The ID of the Team
    id: 56,
    // Array<number> | Filter by the Event in which the Ranking was achieved (optional)
    event: ...,
    // Array<number> | Filter by the Rank (optional)
    rank: ...,
    // Array<number> | Filter by the Season during which the Ranking was (optional)
    season: ...,
  } satisfies TeamGetRankingsRequest;

  try {
    const data = await api.teamGetRankings(body);
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
| **id** | `number` | The ID of the Team | [Defaults to `undefined`] |
| **event** | `Array<number>` | Filter by the Event in which the Ranking was achieved | [Optional] |
| **rank** | `Array<number>` | Filter by the Rank | [Optional] |
| **season** | `Array<number>` | Filter by the Season during which the Ranking was | [Optional] |

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
| **200** | List of Rankings |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## teamGetSkills

> PaginatedSkill teamGetSkills(id, event, type, season)



Gets a List of Skills runs that a given Team has performed

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetSkillsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // number | The ID of the Team
    id: 56,
    // Array<number> | Filter by the Event at which the Skills run was performed (optional)
    event: ...,
    // Array<'driver' | 'programming'> | Filter by Type of Skills run (optional)
    type: ...,
    // Array<number> | Filter by the Season during which the Skills run was performed (optional)
    season: ...,
  } satisfies TeamGetSkillsRequest;

  try {
    const data = await api.teamGetSkills(body);
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
| **id** | `number` | The ID of the Team | [Defaults to `undefined`] |
| **event** | `Array<number>` | Filter by the Event at which the Skills run was performed | [Optional] |
| **type** | `driver`, `programming` | Filter by Type of Skills run | [Optional] [Enum: driver, programming] |
| **season** | `Array<number>` | Filter by the Season during which the Skills run was performed | [Optional] |

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


## teamGetTeam

> Team teamGetTeam(id)



Gets a Single Team

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetTeamRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // number | The ID of the Team
    id: 56,
  } satisfies TeamGetTeamRequest;

  try {
    const data = await api.teamGetTeam(body);
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
| **id** | `number` | The ID of the Team | [Defaults to `undefined`] |

### Return type

[**Team**](Team.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A single Team |  -  |
| **404** | Specified Team not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## teamGetTeams

> PaginatedTeam teamGetTeams(id, number, event, registered, program, grade, country, myTeams)



Gets a List of Teams

### Example

```ts
import {
  Configuration,
  TeamApi,
} from '';
import type { TeamGetTeamsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new TeamApi(config);

  const body = {
    // Array<number> | Filter by Team ID (optional)
    id: ...,
    // Array<string> | Filter by Team Number (optional)
    number: ...,
    // Array<number> | Filter by Events that Teams have attended (optional)
    event: ...,
    // boolean | Filter by whether or not the Team is Registered (optional)
    registered: true,
    // Array<number> | Filter by the Program that the Team is part of (optional)
    program: ...,
    // Array<'College' | 'High School' | 'Middle School' | 'Elementary School'> | Filter by the Grade of the Team (optional)
    grade: ...,
    // Array<string> | Filter by the Country of the Team (optional)
    country: ...,
    // boolean | Only show teams associated with the authenticated user. (optional)
    myTeams: true,
  } satisfies TeamGetTeamsRequest;

  try {
    const data = await api.teamGetTeams(body);
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
| **id** | `Array<number>` | Filter by Team ID | [Optional] |
| **number** | `Array<string>` | Filter by Team Number | [Optional] |
| **event** | `Array<number>` | Filter by Events that Teams have attended | [Optional] |
| **registered** | `boolean` | Filter by whether or not the Team is Registered | [Optional] [Defaults to `undefined`] |
| **program** | `Array<number>` | Filter by the Program that the Team is part of | [Optional] |
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

