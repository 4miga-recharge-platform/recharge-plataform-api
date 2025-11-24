# 🏗️ Infraestrutura GCP - Recharge Platform API

## 📋 Visão Geral

Este documento descreve todos os serviços ativos no Google Cloud Platform, suas funções, relacionamentos e custos estimados.

---

## 🌐 Serviços de Aplicação (Cloud Run)

### 1. **recharge-api**
- **Função**: API backend principal (NestJS)
- **Região**: `us-central1`
- **URL**: https://recharge-api-7g3odbknja-uc.a.run.app
- **Recursos**: 1 vCPU, 512Mi RAM
- **Escalabilidade**: Min 1, Max 10 instâncias
- **Concorrência**: 80 requisições/instância
- **Configuração Especial**:
  - ✅ VPC Connector configurado (`recharge-api-connector`)
  - ✅ Egress via VPC (IP fixo de saída)
- **Conexões**:
  - → Cloud SQL (`recharge-db`) - Banco de dados
  - → Cloud Storage (`4miga-images`) - Armazenamento de imagens
  - → API Bigo (via IP fixo `136.116.117.1`)
- **Custo Estimado**: ~$15-25/mês (uso variável)

### 2. **bigo-frontend**
- **Função**: Frontend para Bigo Live
- **Região**: `us-central1`
- **URL**: https://bigo-frontend-7g3odbknja-uc.a.run.app
- **IP Estático**: `34.120.7.164` (entrada)
- **Conexões**: Apenas requisições HTTP (sem egress externo)
- **Custo Estimado**: ~$5-10/mês (uso baixo)

### 3. **store-frontend**
- **Função**: Frontend da loja
- **Região**: `us-central1`
- **URL**: https://store-frontend-7g3odbknja-uc.a.run.app
- **IP Estático**: `34.160.89.165` (entrada)
- **Conexões**: Apenas requisições HTTP (sem egress externo)
- **Custo Estimado**: ~$5-10/mês (uso baixo)

---

## 🗄️ Banco de Dados (Cloud SQL)

### 4. **recharge-db**
- **Função**: Banco de dados PostgreSQL 15
- **Tier**: `db-g1-small`
- **Região**: `us-central1-c`
- **Especificações**: 1 vCPU, ~1.7GB RAM, 10GB PD-SSD
- **Conexões**:
  - ← `recharge-api` (requisições de leitura/escrita)
- **Custo Estimado**: ~$28-34/mês
  - Instância: ~$25-30/mês
  - Storage (10GB): ~$1.70/mês
  - Backup (se habilitado): ~$1-2/mês

---

## 🌍 Rede e Conectividade

### 5. **recharge-api-vpc-simple**
- **Função**: Rede VPC customizada
- **Tipo**: CUSTOM
- **BGP Routing**: REGIONAL
- **Subnets**:
  - `recharge-api-subnet-simple` (10.1.0.0/26) - Subnet principal
  - `recharge-api-connector-subnet` (10.1.0.64/28) - Subnet para VPC Connector
- **Conexões**:
  - → Cloud Router (`recharge-api-router`)
  - → VPC Connector (`recharge-api-connector`)
- **Custo**: $0 (gratuito)

### 6. **recharge-api-router**
- **Função**: Roteador Cloud Router para gerenciar tráfego VPC
- **Região**: `us-central1`
- **VPC**: `recharge-api-vpc-simple`
- **Conexões**:
  - → Cloud NAT (`recharge-api-nat`)
- **Custo Estimado**: ~$36.00/mês ($0.05/hora × 720h)

### 7. **recharge-api-nat**
- **Função**: Network Address Translation com IP fixo de saída
- **Router**: `recharge-api-router`
- **IP Estático**: `136.116.117.1` (via `recharge-api-egress-ip`)
- **Configuração**: Todas as subnets (`ALL_SUBNETWORKS_ALL_IP_RANGES`)
- **Conexões**:
  - ← VPC Connector (tráfego de saída do Cloud Run)
  - → Internet (com IP fixo `136.116.117.1`)
- **Custo Estimado**: ~$32.40/mês ($0.045/hora × 720h)
- **Custo Adicional**: $0.045/GB de egress (variável)

### 8. **recharge-api-connector**
- **Função**: Serverless VPC Connector (conecta Cloud Run à VPC)
- **Região**: `us-central1`
- **Subnet**: `recharge-api-connector-subnet` (10.1.0.64/28)
- **Configuração**: 2-3 instâncias e2-micro (mínimo obrigatório)
- **Conexões**:
  - ← `recharge-api` (Cloud Run service)
  - → Cloud NAT (via VPC)
- **Custo Estimado**: ~$10-15/mês (2 instâncias e2-micro mínimas)

### 9. **recharge-api-egress-ip**
- **Função**: IP estático para egress (requisições de saída)
- **IP**: `136.116.117.1`
- **Região**: `us-central1`
- **Status**: IN_USE (pelo Cloud NAT)
- **Uso**: Todas as requisições de saída do `recharge-api` usam este IP
- **Conexões**:
  - ← Cloud NAT (`recharge-api-nat`)
  - → API Bigo (whitelist necessário)
- **Custo Estimado**: ~$7.20/mês ($0.01/hora × 720h)

### 10. **bigo-frontend-ip**
- **Função**: IP estático de entrada para `bigo-frontend`
- **IP**: `34.120.7.164`
- **Status**: IN_USE
- **Custo Estimado**: ~$7.20/mês

### 11. **store-frontend-ip**
- **Função**: IP estático de entrada para `store-frontend`
- **IP**: `34.160.89.165`
- **Status**: IN_USE
- **Custo Estimado**: ~$7.20/mês

### 12. **lb-ip**
- **Função**: IP estático para Load Balancer (se aplicável)
- **IP**: `34.54.92.191`
- **Status**: IN_USE
- **Custo Estimado**: ~$7.20/mês

---

## 💾 Armazenamento (Cloud Storage)

### 13. **4miga-images**
- **Função**: Bucket para armazenamento de imagens
- **Localização**: US
- **Conexões**:
  - ← `recharge-api` (upload/download de imagens)
- **Custo Estimado**: ~$0.10-1/mês (assumindo 1-5GB armazenados)
  - Storage: ~$0.020/GB/mês
  - Operações: variável

---

## 🔗 Diagrama de Relacionamentos

```
Internet
  ↓
[IPs Estáticos de Entrada]
  ├─ bigo-frontend-ip (34.120.7.164) → bigo-frontend
  ├─ store-frontend-ip (34.160.89.165) → store-frontend
  └─ lb-ip (34.54.92.191) → Load Balancer

[Cloud Run Services]
  ├─ bigo-frontend (apenas entrada HTTP)
  ├─ store-frontend (apenas entrada HTTP)
  └─ recharge-api
      ├─ → Cloud SQL (recharge-db)
      ├─ → Cloud Storage (4miga-images)
      └─ → VPC Connector
          └─ → VPC (recharge-api-vpc-simple)
              └─ → Cloud Router
                  └─ → Cloud NAT
                      └─ → IP Fixo (136.116.117.1)
                          └─ → API Bigo (externo)
```

---

## 💰 Resumo de Custos Mensais

| Categoria | Serviço | Custo Estimado |
|-----------|---------|----------------|
| **Cloud Run** | recharge-api | $15-25 |
| **Cloud Run** | bigo-frontend | $5-10 |
| **Cloud Run** | store-frontend | $5-10 |
| **Cloud SQL** | recharge-db (db-g1-small) | $28-34 |
| **IPs Estáticos** | recharge-api-egress-ip | $7.20 |
| **IPs Estáticos** | bigo-frontend-ip | $7.20 |
| **IPs Estáticos** | store-frontend-ip | $7.20 |
| **IPs Estáticos** | lb-ip | $7.20 |
| **Cloud Router** | recharge-api-router | $36.00 |
| **Cloud NAT** | recharge-api-nat | $32.40 |
| **VPC Connector** | recharge-api-connector | $10-15 |
| **Cloud Storage** | 4miga-images | $0.10-1 |
| **VPC Networks** | recharge-api-vpc-simple | $0 |
| **TOTAL FIXO** | | **~$160-192/mês** |
| **TOTAL VARIÁVEL** | Egress traffic, operações | Variável |

---

## 📊 Custos por Funcionalidade

### **IP Fixo de Saída (Bigo Integration)**
- Cloud Router: $36.00/mês
- Cloud NAT: $32.40/mês
- VPC Connector: $10-15/mês
- IP Estático: $7.20/mês
- **Subtotal**: ~$85-90/mês

### **Aplicações**
- Cloud Run (3 serviços): $25-45/mês
- IPs Estáticos (entrada): $21.60/mês
- **Subtotal**: ~$47-67/mês

### **Banco de Dados**
- Cloud SQL: $28-34/mês

### **Armazenamento**
- Cloud Storage: $0.10-1/mês

---

## ⚠️ Observações Importantes

1. **Custos Variáveis**:
   - Cloud NAT cobra $0.045/GB de egress
   - Cloud Run cobra por uso de CPU/memória/requisições
2. **Escalabilidade**:
   - Cloud Run escala automaticamente (1-10 instâncias)
   - Cloud SQL pode precisar upgrade em picos altos
3. **VPC Connector**: Mínimo obrigatório de 2 instâncias

---

## 🔧 Recursos Compartilhados

- **VPC**: `recharge-api-vpc-simple` (pode ser usado por outros serviços futuros)
- **Cloud Router/NAT**: Pode ser compartilhado se outros serviços precisarem de IP fixo
- **Subnets**: Separadas por função (principal vs. connector)

---

*Última atualização: 24 de Novemvbro de 2025*

