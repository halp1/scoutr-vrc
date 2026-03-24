# ProgramApi

All URIs are relative to *https://www.robotevents.com/api/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**programGetProgram**](ProgramApi.md#programgetprogram) | **GET** /programs/{id} |  |
| [**programGetPrograms**](ProgramApi.md#programgetprograms) | **GET** /programs |  |



## programGetProgram

> Program programGetProgram(id)



Find a single Program by ID

### Example

```ts
import {
  Configuration,
  ProgramApi,
} from '';
import type { ProgramGetProgramRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProgramApi(config);

  const body = {
    // number | The Program ID
    id: 56,
  } satisfies ProgramGetProgramRequest;

  try {
    const data = await api.programGetProgram(body);
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
| **id** | `number` | The Program ID | [Defaults to `undefined`] |

### Return type

[**Program**](Program.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Single Program |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## programGetPrograms

> PaginatedProgram programGetPrograms(id)



Gets a List of Programs

### Example

```ts
import {
  Configuration,
  ProgramApi,
} from '';
import type { ProgramGetProgramsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProgramApi(config);

  const body = {
    // Array<number> | Filter by program ID (optional)
    id: ...,
  } satisfies ProgramGetProgramsRequest;

  try {
    const data = await api.programGetPrograms(body);
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
| **id** | `Array<number>` | Filter by program ID | [Optional] |

### Return type

[**PaginatedProgram**](PaginatedProgram.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | List of Programs |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

