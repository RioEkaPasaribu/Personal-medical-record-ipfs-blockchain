const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// KONFIGURASI
const TOTAL_REQUESTS = 50;
const DELAY_MS = 5000;
const BASE_URL = 'http://localhost:4001/v1';
const filePath = path.resolve('C:/Users/ASUS/Documents/File Kuliah/11S21033_Rio Eka Pasaribu_TugasW2.pdf');

const PATIENTS = [
  {
    address: '0x8efaDb6a4BaF8C520d168210924c6B79A74aa5e3',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg4ZWZhRGI2YTRCYUY4QzUyMGQxNjgyMTA5MjRjNkI3OUE3NGFhNWUzIiwiaWF0IjoxNzUxMzYyNDM2fQ.9Kc3hwcEJW6y2d5we6dBJmvrrxJWKgKvd8Ra5nmVg3E'
  },
  {
    address: '0xAbC0AB231a23Aa3bBe063Ff3Ee01429d9C910C5F',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhBYkMwQUIyMzFhMjNBYTNiQmUwNjNGZjNFZTAxNDI5ZDlDOTEwQzVGIiwiaWF0IjoxNzUxMzYyNDc1fQ.cchO2yUFngFX_XrzmGJSWR5P5bH8U6H40IFKbkOAyAc'
  },
  {
    address: '0xE67aB04678c342Ed10378cB8406DFb0796863f4a',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhFNjdhQjA0Njc4YzM0MkVkMTAzNzhjQjg0MDZERmIwNzk2ODYzZjRhIiwiaWF0IjoxNzUxMzYyNDk0fQ.MR52dSvITIx-y1R6dbQTBSxW-c-DQSwZtZsKe6nonNU'
  }
];

const stats = {
  create: [], read: [], update: [], delete: [],
  createFail: 0, readFail: 0, updateFail: 0, deleteFail: 0
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCRUD(i, patient) {
  const headers = { Authorization: patient.token };
  const result = { recordId: null };

  try {
    // CREATE
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('patientAddress', patient.address);
    form.append('description', `Test #${i}`);
    form.append('recordType', 'Health Record');

    const t0 = performance.now();
    const res = await axios.post(`${BASE_URL}/health-records`, form, {
      headers: { ...form.getHeaders(), ...headers }
    });
    const t1 = performance.now();
    stats.create.push(t1 - t0);
    result.recordId = res.data.data.recordId;
    console.log(`[${i}] ✅ Create - Record ID: ${result.recordId}`);

    // READ
    const t2 = performance.now();
    await axios.get(`${BASE_URL}/health-records/${patient.address}/${result.recordId}`, {
      headers
    });
    const t3 = performance.now();
    stats.read.push(t3 - t2);
    console.log(`    ↳ ✅ Read`);

    // UPDATE
    const t4 = performance.now();
    const updateRes = await axios.put(`${BASE_URL}/health-records/${patient.address}/${result.recordId}/no-file`,
      new URLSearchParams({ description: `Updated #${i}`, recordType: 'Radiologi' }),
      { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const t5 = performance.now();
    stats.update.push(t5 - t4);

    const updatedRecordId = updateRes?.data?.data?.recordId;
    if (!updatedRecordId) throw new Error('RecordId tidak ditemukan di respons update.');
    console.log(`    ↳ ✅ Update - new Record ID: ${updatedRecordId}`);

    // DELETE
    const t6 = performance.now();
    await axios.delete(`${BASE_URL}/health-records/${patient.address}/${updatedRecordId}`, { headers });
    const t7 = performance.now();
    stats.delete.push(t7 - t6);
    console.log(`    ↳ ✅ Delete`);
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    if (!result.recordId) stats.createFail++;
    else if (err.config?.method === 'get') stats.readFail++;
    else if (err.config?.method === 'put') stats.updateFail++;
    else if (err.config?.method === 'delete') stats.deleteFail++;

    console.log(`[${i}] ❌ Failed during ${err.config?.method?.toUpperCase()}`);
    console.log(`    ↳ ${err.response?.status || 500} - ${message}`);
  }
}

function printStat(name, data, failed) {
  const total = data.length + failed;
  const avg = data.reduce((a, b) => a + b, 0) / (data.length || 1);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const throughput = data.length / (data.reduce((a, b) => a + b, 0) / 1000);
  const errorRate = (failed / total) * 100;

  console.log(`\n📊 ${name.toUpperCase()} STATS`);
  console.log(`Total Requests   : ${total}`);
  console.log(`Success          : ${data.length}`);
  console.log(`Failure          : ${failed}`);
  console.log(`Average Time     : ${avg.toFixed(2)} ms`);
  console.log(`Min Time         : ${min.toFixed(2)} ms`);
  console.log(`Max Time         : ${max.toFixed(2)} ms`);
  console.log(`Throughput       : ${throughput.toFixed(2)} req/sec`);
  console.log(`Error Rate       : ${errorRate.toFixed(2)} %`);
}

async function runTest() {
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const patient = PATIENTS[i % PATIENTS.length];
    await testCRUD(i, patient);
    if (i < TOTAL_REQUESTS) await sleep(DELAY_MS);
  }

  printStat('CREATE', stats.create, stats.createFail);
  printStat('READ', stats.read, stats.readFail);
  printStat('UPDATE', stats.update, stats.updateFail);
  printStat('DELETE', stats.delete, stats.deleteFail);
}

runTest();