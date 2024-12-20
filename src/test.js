import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://127.0.0.1:8011';

// Utility function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to convert Windows FILETIME to JavaScript Date
const fileTimeToDate = (fileTime) => {
  // FILETIME is a 64-bit value representing the number of 100-nanosecond intervals since January 1, 1601 UTC
  const bigIntTime = BigInt(fileTime);
  const windowsEpochDiff = BigInt('116444736000000000'); // Difference between Windows and Unix epoch in 100ns intervals
  const unixTimestampNs = (bigIntTime - windowsEpochDiff) / BigInt(10000); // Convert to milliseconds
  return new Date(Number(unixTimestampNs));
};

// Test 1: Basic connection test
async function testConnection() {
  try {
    const response = await axios.get('/', {
      params: {
        search: 'test',
        json: 1
      }
    });
    console.log('Connection test passed:', response.data?.totalResults !== undefined ? 
      `Got ${response.data.totalResults} results` : 'No data');
    return true;
  } catch (error) {
    console.error('Connection test failed:', error.message);
    return false;
  }
}

// Test 2: Test search parameters
async function testSearchParameters() {
  try {
    // Test case sensitivity
    const caseResponse = await axios.get('/', {
      params: {
        search: 'TEST',
        json: 1,
        case: 1
      }
    });
    console.log('Case sensitive search test:', caseResponse.data?.totalResults !== undefined ? 
      `Got ${caseResponse.data.totalResults} results` : 'No results');

    await delay(500); // Delay between requests

    // Test whole word matching
    const wholeWordResponse = await axios.get('/', {
      params: {
        search: 'test',
        json: 1,
        wholeword: 1
      }
    });
    console.log('Whole word search test:', wholeWordResponse.data?.totalResults !== undefined ? 
      `Got ${wholeWordResponse.data.totalResults} results` : 'No results');

    await delay(500); // Delay between requests

    // Test regex search
    const regexResponse = await axios.get('/', {
      params: {
        search: 'test.*\\.txt',
        json: 1,
        regex: 1
      }
    });
    console.log('Regex search test:', regexResponse.data?.totalResults !== undefined ? 
      `Got ${regexResponse.data.totalResults} results` : 'No results');

    await delay(500); // Delay between requests

    // Test path search
    const pathResponse = await axios.get('/', {
      params: {
        search: 'Documents',
        json: 1,
        path: 1
      }
    });
    console.log('Path search test:', pathResponse.data?.totalResults !== undefined ? 
      `Got ${pathResponse.data.totalResults} results` : 'No results');

    return true;
  } catch (error) {
    console.error('Search with scope test failed:', error.message);
    return false;
  }
}

// Test 3: Test sorting functionality
async function testSorting() {
  try {
    // Test sorting by different fields
    const sortFields = ['name', 'path', 'size', 'date_modified'];
    for (const field of sortFields) {
      const ascResponse = await axios.get('/', {
        params: {
          search: 'test',
          json: 1,
          sort: field,
          ascending: 1,
          path_column: 1,
          size_column: 1,
          date_modified_column: 1
        }
      });
      console.log(`Sorting by ${field} (ascending) test:`, ascResponse.data?.totalResults !== undefined ? 
        `Got ${ascResponse.data.totalResults} results` : 'No results');
      
      await delay(500); // Increased delay between requests to prevent rate limiting
      
      const descResponse = await axios.get('/', {
        params: {
          search: 'test',
          json: 1,
          sort: field,
          ascending: 0,
          path_column: 1,
          size_column: 1,
          date_modified_column: 1
        }
      });
      console.log(`Sorting by ${field} (descending) test:`, descResponse.data?.totalResults !== undefined ? 
        `Got ${descResponse.data.totalResults} results` : 'No results');
      
      await delay(500); // Increased delay between requests to prevent rate limiting
    }
    return true;
  } catch (error) {
    console.error('Sorting test failed:', error.message);
    return false;
  }
}

// Test 4: Test error handling
async function testErrorHandling() {
  try {
    // Test invalid port to simulate ECONNREFUSED
    await axios.get('http://127.0.0.1:9999/');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('ECONNREFUSED error handling test passed');
    }
  }

  try {
    // Test multiple invalid parameters
    await axios.get('/', {
      params: {
        search: 'test',
        json: 1,
        sort: 'invalid_field',
        case: 'invalid',
        count: 'not_a_number'
      }
    });
    console.log('Warning: Server accepted invalid parameters without error');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('Invalid parameter error handling test passed (400 Bad Request)');
    } else {
      console.log('Warning: Server returned', error.response?.status || 'unknown status', 'for invalid parameters');
    }
  }

  return true;
}

// Test 5: Test result formatting
async function testResultFormatting() {
  try {
    const response = await axios.get('/', {
      params: {
        search: 'test',
        json: 1,
        path_column: 1,
        size_column: 1,
        date_modified_column: 1,
        count: 5
      }
    });
    
    if (response.data?.results) {
      // Log the first result to understand the data structure
      console.log('Sample result structure:', JSON.stringify(response.data.results[0], null, 2));
      
      const formattedResults = response.data.results.map(result => {
        const size = result.size ? `${(parseInt(result.size) / (1024 * 1024)).toFixed(2)} MB` : 'N/A';
        const date = result.date_modified ? 
          (result.date_modified === '0' ? 'No date' : fileTimeToDate(result.date_modified).toLocaleString()) : 
          'N/A';
        return `Name: ${result.name}\nPath: ${result.path}\nSize: ${size}\nModified: ${date}\n`;
      }).join('\n');
      
      console.log(`Total results: ${response.data.totalResults}`);
      console.log('Result formatting test passed. Sample output:\n', formattedResults);
      return true;
    }
    console.log('Result formatting test passed but no results found');
    return true;
  } catch (error) {
    console.error('Result formatting test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting tests...\n');
  
  console.log('Test 1: Basic Connection');
  await testConnection();
  console.log('\n');
  
  console.log('Test 2: Search Parameters');
  await testSearchParameters();
  console.log('\n');
  
  console.log('Test 3: Sorting Functionality');
  await testSorting();
  console.log('\n');
  
  console.log('Test 4: Error Handling');
  await testErrorHandling();
  console.log('\n');
  
  console.log('Test 5: Result Formatting');
  await testResultFormatting();
  console.log('\n');
  
  console.log('Tests completed');
}

// Add request/response interceptors for debugging
axios.interceptors.request.use(request => {
  console.log('Request:', {
    method: request.method,
    url: request.url,
    params: request.params
  });
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      totalResults: response.data?.totalResults,
      data: response.data ? 'Data received' : 'No data'
    });
    return response;
  },
  error => {
    console.log('Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      response: error.response?.data
    });
    throw error;
  }
);

runTests().catch(console.error);
