const clone = (obj) => JSON.parse(JSON.stringify(obj));

const init = (data) => {
    console.log("init ....");
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    

    data.baseUrl = pathname;

    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://0.0.0.0')) {
        data.env = 'local';
    } else {
        data.env = 'live';
    }

    if(data.env == 'local') {
        data.formData.redis.host = 'localhost';
        data.formData.sourceRedis.host = 'localhost';
    } else {
        data.formData.redis.host = '';
        data.formData.sourceRedis.host = '';
        data.baseUrl += "/";
    }

    console.log(`origin=${origin}, pathname=${pathname}, data.env=${data.env}, data.baseUrl=${data.baseUrl}`);
}


const submitHandler = (data) => {
    data.formState.isLoading = true;
    const startTime = performance.now();

    // String to number
    data.formData.redis.port = Number(data.formData.redis.port);
    data.formData.sourceRedis.port = Number(data.formData.sourceRedis.port);
    data.formData.action.ttl = Number(data.formData.action.ttl);

    fetch(`${data.baseUrl}api/process`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`
        },
        body: JSON.stringify(data.formData)
    })
    .then(res => res.json())
    .then(res => {
        data.formState.isError = false; data.formState.errorMessage = '';
        data.response = res;
        data.filteredResponse = clone(res);

        if(res.error && res.status.includes(`Unable to connect to Redis`)) {
            if(res.status.includes(`Unable to connect to Redis ${data.formData.redisHost}:${data.formData.redisPort}`)) {
                data.formState.redisError = res.status;
            } else if(res.status.includes(`Unable to connect to Redis ${data.formData.sourceRedisHost}:${data.formData.sourceRedisPort}`)) {
                data.formState.sourceRedisError = res.status;
            }
        } else {
            data.formState.redisError = '';
            data.formState.sourceRedisError = '';
        }
    })
    .catch(err => {
        console.error(err);
        data.formState.errorMessage = 'Service error';
    })
    .finally(() => {
        data.formState.isLoading = false;
        const endTime = performance.now();
        data.operation.timeTaken = endTime - startTime;
        console.log(`Operation time: ${data.operation.timeTaken} milliseconds`);
        })
    
}

const downloadCSV = (data) => {
    let csvString = "";
    try {
        let csvRows = [];
        if(data.response?.data) {
            if(Array.isArray(data.response.data)) {
                const headers = Object.keys(data.response.data[0]);
                csvRows.push(headers.join(','));
                
                data.response.data.forEach(row => {
                    let values = Object.values(row);
                    values = values.map(value => `"${value}"`).join(',');
                    csvRows.push(values);
                });
            } else {
                csvRows = [];
                const headers = Object.keys(data.response.data);
                csvRows.push(headers.join(','));
                const values = Object.values(data.response.data).join(',');
                csvRows.push(values);
            }

            csvString = csvRows.join('\n');
        }
    } catch (err) {
        console.error(err);
    }

    const csvFile = new Blob([csvString], { type: 'text/csv' });
    const csvURL = URL.createObjectURL(csvFile);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = csvURL;
    a.download = 'output.csv';
    a.click();
}


const downloadJSON = (data) => {
    const jsonFile = new Blob([JSON.stringify(data.response.data)], { type: 'text/json' });
    const csvURL = URL.createObjectURL(jsonFile);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = csvURL;
    a.download = 'output.json';
    a.click();
}

const searchHandler = (data) => {
    console.log("In search", data.searchTerm);
    if(data.searchTerm && data.searchTerm.length > 0) {
        data.filteredResponse.data = clone(data.response.data.filter(site => JSON.stringify(site).toLocaleLowerCase().includes(data.searchTerm.toLocaleLowerCase())));
    } else {
        data.filteredResponse.data = clone(data.response.data);
    }
}
