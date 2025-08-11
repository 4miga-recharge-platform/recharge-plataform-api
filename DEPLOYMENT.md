# 🚀 Deployment & Scalability

## **Current Infrastructure**

### **Google Cloud Platform (GCP)**
- **Cloud Run**: NestJS API
- **Cloud SQL**: PostgreSQL
- **Container Registry**: Docker Images
- **Cloud Build**: CI/CD (configured for future use)

### **Scalability Configuration**

#### **Cloud Run - Current Capacity:**
- **Minimum**: 1 instance
- **Maximum**: 10 instances
- **Requests per instance**: 80 simultaneous
- **Total maximum**: 800 simultaneous requests

## **🔄 How it works with multiple accesses:**

### **Automatic Scalability:**
- **Auto-scaling** based on CPU and requests
- **Automatic load balancing**
- **Zero downtime** during scaling
- **Pay-per-use** - only pay when used

### **📊 Traffic Scenarios:**

#### **Scenario 1: Low Traffic**
- 1-80 simultaneous users → **1 instance**
- Fast response, low cost

#### **Scenario 2: Medium Traffic**
- 81-160 simultaneous users → **2 instances**
- Scales automatically

#### **Scenario 3: High Traffic**
- 161-800 simultaneous users → **Up to 10 instances**
- Still works well

#### **Scenario 4: Very High Traffic**
- 800+ simultaneous users → **Waiting queue**
- Requests wait for availability

## **⚡ Cloud Run Advantages:**

### **✅ Positive Points:**
- **Automatic scaling** - no manual intervention
- **Pay-per-use** - only pay when used
- **Zero downtime** - always available
- **Automatic load balancing**
- **Cold start** only on first request

### **⚠️ Current Limitations:**
- **Maximum 10 instances** (can be increased)
- **80 req/instance** (can be configured)
- **Cold start** on first request

## **🔧 To Increase Capacity:**

```bash
# Increase to 20 maximum instances
gcloud run services update recharge-api \
  --max-instances=20 \
  --region=us-central1

# Increase requests per instance
gcloud run services update recharge-api \
  --concurrency=100 \
  --region=us-central1
```

## **📈 Monitoring:**

### **GCP Console:**
- **Cloud Run** → **recharge-api** → **Metrics**
- View request, CPU, memory graphs
- **Cloud Logging** for detailed logs

### **Important Metrics:**
- **Request count** - number of requests
- **CPU utilization** - CPU usage
- **Memory utilization** - memory usage
- **Instance count** - number of active instances

## **🛠️ Deployment Scripts:**

### **Simple Deploy:**
```bash
./scripts/deploy.sh
```

### **Deploy with Migrations:**
```bash
./scripts/deploy-migrate-only.sh
```

### **Environment Variables:**
- **Local**: `.env` (development)
- **Production**: `.env.deploy` (Cloud Run)

## **🔒 Security:**

### **Sensitive Variables:**
- `.env.deploy` is in `.gitignore`
- Production variables protected
- Secrets managed by GCP

### **Network:**
- **Cloud SQL**: Authorized network `0.0.0.0/0` (development)
- **Cloud Run**: Public access configured

## **📋 Summary:**

**Your application is well prepared to scale automatically!**

- ✅ **Automatic scaling** without intervention
- ✅ **Complete monitoring**
- ✅ **Security configured**
- ✅ **Optimized costs** (pay for what you use)
- ✅ **Zero downtime** guaranteed

---

*Last updated: July 2025*
