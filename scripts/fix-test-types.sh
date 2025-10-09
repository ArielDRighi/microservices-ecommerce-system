#!/bin/bash

# Script para agregar tipos a las llamadas de ResponseHelper.extractData en tests E2E

cd "$(dirname "$0")/.."

# Orders
sed -i 's/ResponseHelper\.extractData(userResponse1)/ResponseHelper.extractData<{ accessToken: string; user: { id: string } }>(userResponse1)/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(userResponse2)/ResponseHelper.extractData<{ accessToken: string }>(userResponse2)/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(product1Response)/ResponseHelper.extractData<{ id: string }>(product1Response)/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(product2Response)/ResponseHelper.extractData<{ id: string }>(product2Response)/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(user2Response)/ResponseHelper.extractData<{ id: string }>(user2Response)/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/const responseData = ResponseHelper\.extractData(response);/const responseData = ResponseHelper.extractData<any>(response);/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/const responseData1 = ResponseHelper\.extractData(response1);/const responseData1 = ResponseHelper.extractData<any>(response1);/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/const responseData2 = ResponseHelper\.extractData(response2);/const responseData2 = ResponseHelper.extractData<any>(response2);/g' test/e2e/api/orders.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(response)/ResponseHelper.extractData<any>(response)/g' test/e2e/api/orders.e2e-spec.ts

# Products
sed -i 's/ResponseHelper\.extractData(adminResponse)/ResponseHelper.extractData<{ accessToken: string }>(adminResponse)/g' test/e2e/api/products.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(product1)/ResponseHelper.extractData<{ id: string }>(product1)/g' test/e2e/api/products.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(product2)/ResponseHelper.extractData<{ id: string }>(product2)/g' test/e2e/api/products.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(product3)/ResponseHelper.extractData<{ id: string }>(product3)/g' test/e2e/api/products.e2e-spec.ts
sed -i 's/const responseData = ResponseHelper\.extractData(response);/const responseData = ResponseHelper.extractData<any>(response);/g' test/e2e/api/products.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(response)/ResponseHelper.extractData<any>(response)/g' test/e2e/api/products.e2e-spec.ts

# Categories
sed -i 's/ResponseHelper\.extractData(adminResponse)/ResponseHelper.extractData<{ accessToken: string }>(adminResponse)/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(rootRes)/ResponseHelper.extractData<{ id: string }>(rootRes)/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const responseData = ResponseHelper\.extractData(response);/const responseData = ResponseHelper.extractData<any>(response);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const data = ResponseHelper\.extractData(response);/const data = ResponseHelper.extractData<any>(response);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const parentData = ResponseHelper\.extractData(parentRes);/const parentData = ResponseHelper.extractData<any>(parentRes);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const childData = ResponseHelper\.extractData(childRes);/const childData = ResponseHelper.extractData<any>(childRes);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const grandchildData = ResponseHelper\.extractData(grandchildRes);/const grandchildData = ResponseHelper.extractData<any>(grandchildRes);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const child1Data = ResponseHelper\.extractData(child1Res);/const child1Data = ResponseHelper.extractData<any>(child1Res);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const child2Data = ResponseHelper\.extractData(child2Res);/const child2Data = ResponseHelper.extractData<any>(child2Res);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const level1Data = ResponseHelper\.extractData(level1Res);/const level1Data = ResponseHelper.extractData<any>(level1Res);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const level2Data = ResponseHelper\.extractData(level2Res);/const level2Data = ResponseHelper.extractData<any>(level2Res);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const rootData = ResponseHelper\.extractData(rootRes);/const rootData = ResponseHelper.extractData<any>(rootRes);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const createdCategory = ResponseHelper\.extractData(response);/const createdCategory = ResponseHelper.extractData<any>(response);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/const created = ResponseHelper\.extractData(response);/const created = ResponseHelper.extractData<any>(response);/g' test/e2e/api/categories.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(response)/ResponseHelper.extractData<any>(response)/g' test/e2e/api/categories.e2e-spec.ts

# Inventory
sed -i 's/ResponseHelper\.extractData(registerResponse)/ResponseHelper.extractData<{ accessToken: string }>(registerResponse)/g' test/e2e/api/inventory.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(product1Response)/ResponseHelper.extractData<{ id: string }>(product1Response)/g' test/e2e/api/inventory.e2e-spec.ts
sed -i 's/const data = ResponseHelper\.extractData(response);/const data = ResponseHelper.extractData<any>(response);/g' test/e2e/api/inventory.e2e-spec.ts

# Users
sed -i 's/const responseData = ResponseHelper\.extractData(response);/const responseData = ResponseHelper.extractData<any>(response);/g' test/e2e/api/users.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(response)/ResponseHelper.extractData<any>(response)/g' test/e2e/api/users.e2e-spec.ts

# Business flows
sed -i 's/ResponseHelper\.extractData(adminResponse)/ResponseHelper.extractData<{ accessToken: string }>(adminResponse)/g' test/e2e/business-flows/*.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(userResponse)/ResponseHelper.extractData<{ accessToken: string }>(userResponse)/g' test/e2e/business-flows/*.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(registerRes)/ResponseHelper.extractData<any>(registerRes)/g' test/e2e/business-flows/*.e2e-spec.ts
sed -i 's/const registerData = ResponseHelper\.extractData(registerRes);/const registerData = ResponseHelper.extractData<any>(registerRes);/g' test/e2e/business-flows/*.e2e-spec.ts
sed -i 's/const adminData = ResponseHelper\.extractData(adminRegisterRes);/const adminData = ResponseHelper.extractData<any>(adminRegisterRes);/g' test/e2e/business-flows/*.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(response)/ResponseHelper.extractData<any>(response)/g' test/e2e/business-flows/*.e2e-spec.ts
sed -i 's/ResponseHelper\.extractData(.*Res)/ResponseHelper.extractData<any>(\1Res)/g' test/e2e/business-flows/*.e2e-spec.ts

echo "✅ Tipos agregados exitosamente"
