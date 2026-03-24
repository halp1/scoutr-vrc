# SeasonApi

All URIs are relative to *https://www.robotevents.com/api/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**seasonGetEvents**](SeasonApi.md#seasongetevents) | **GET** /seasons/{id}/events |  |
| [**seasonGetSeason**](SeasonApi.md#seasongetseason) | **GET** /seasons/{id} |  |
| [**seasonGetSeasons**](SeasonApi.md#seasongetseasons) | **GET** /seasons |  |



## seasonGetEvents

> PaginatedEvent seasonGetEvents(id, sku, team, start, end, level)



Gets a List of Events for a given Season

### Example

```ts
import {
  Configuration,
  SeasonApi,
} from '';
import type { SeasonGetEventsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SeasonApi(config);

  const body = {
    // number | The Season ID
    id: 56,
    // Array<string> | Filter by Event SKU (optional)
    sku: ...,
    // Array<number> | Filter by Teams that participated in the Event (optional)
    team: ...,
    // Date | Filter by the Start Date of the Event (optional)
    start: 2013-10-20T19:20:30+01:00,
    // Date | Filter by the End Date of the Event (optional)
    end: 2013-10-20T19:20:30+01:00,
    // Array<'World' | 'National' | 'State' | 'Signature' | 'Other'> | Filter by the Event Level (optional)
    level: ...,
  } satisfies SeasonGetEventsRequest;

  try {
    const data = await api.seasonGetEvents(body);
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
| **id** | `number` | The Season ID | [Defaults to `undefined`] |
| **sku** | `Array<string>` | Filter by Event SKU | [Optional] |
| **team** | `Array<number>` | Filter by Teams that participated in the Event | [Optional] |
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


## seasonGetSeason

> Season seasonGetSeason(id)



Gets a single Season

### Example

```ts
import {
  Configuration,
  SeasonApi,
} from '';
import type { SeasonGetSeasonRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SeasonApi(config);

  const body = {
    // number | The Season ID
    id: 56,
  } satisfies SeasonGetSeasonRequest;

  try {
    const data = await api.seasonGetSeason(body);
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
| **id** | `number` | The Season ID | [Defaults to `undefined`] |

### Return type

[**Season**](Season.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A single Season |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## seasonGetSeasons

> PaginatedSeason seasonGetSeasons(id, program, team, start, end, active)



Gets a List of Seasons

### Example

```ts
import {
  Configuration,
  SeasonApi,
} from '';
import type { SeasonGetSeasonsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new SeasonApi(config);

  const body = {
    // Array<number> | Filter by Season ID (optional)
    id: ...,
    // Array<number> | Filter by Program to which the Season belongs (optional)
    program: ...,
    // Array<number> | Filter by seasons in which the specified teams were active (optional)
    team: ...,
    // Date | Filter by Start Date of the Season (optional)
    start: 2013-10-20T19:20:30+01:00,
    // Date | Filter by End Date of the Season (optional)
    end: 2013-10-20T19:20:30+01:00,
    // boolean | Only include active Seasons (optional)
    active: true,
  } satisfies SeasonGetSeasonsRequest;

  try {
    const data = await api.seasonGetSeasons(body);
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
| **id** | `Array<number>` | Filter by Season ID | [Optional] |
| **program** | `Array<number>` | Filter by Program to which the Season belongs | [Optional] |
| **team** | `Array<number>` | Filter by seasons in which the specified teams were active | [Optional] |
| **start** | `Date` | Filter by Start Date of the Season | [Optional] [Defaults to `undefined`] |
| **end** | `Date` | Filter by End Date of the Season | [Optional] [Defaults to `undefined`] |
| **active** | `boolean` | Only include active Seasons | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginatedSeason**](PaginatedSeason.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of Seasons |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

