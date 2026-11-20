#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// Replace these values locally before uploading. Do not commit real credentials.
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_HOST = "http://192.168.1.100:5000";
const char* DEVICE_ID = "esp32-main";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";

const char* ROOT_CA_CERT = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

#define RC522_SS_PIN 5
#define RC522_RST_PIN 27
#define GREEN_LED_PIN 12
#define RED_LED_PIN 14
#define BUZZER_PIN 13

MFRC522 rfid(RC522_SS_PIN, RC522_RST_PIN);
WiFiClientSecure secureClient;
String currentMode = "attendance";
unsigned long lastConfigRead = 0;
unsigned long lastScanMillis = 0;
const unsigned long scanCooldown = 2500;
bool clockSynced = false;

bool beginApiRequest(HTTPClient& http, const String& endpoint) {
  if (endpoint.startsWith("https://")) {
    if (!clockSynced) return false;
    return http.begin(secureClient, endpoint);
  }
  return http.begin(endpoint);
}

void syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  unsigned long started = millis();
  time_t now = time(nullptr);
  while (now < 1700000000 && millis() - started < 10000) {
    delay(250);
    now = time(nullptr);
  }
  clockSynced = now >= 1700000000;
  Serial.println(clockSynced ? "System time synchronized" : "Time sync failed");
}

void setAllOutputsOff() {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
}

void greenSuccess() {
  digitalWrite(GREEN_LED_PIN, HIGH);
  tone(BUZZER_PIN, 1200, 120);
  delay(500);
  setAllOutputsOff();
}

void redUnknown() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(RED_LED_PIN, HIGH);
    tone(BUZZER_PIN, 700, 100);
    delay(180);
    digitalWrite(RED_LED_PIN, LOW);
  }
  setAllOutputsOff();
}

void redDuplicate() {
  digitalWrite(RED_LED_PIN, HIGH);
  tone(BUZZER_PIN, 550, 250);
  delay(450);
  setAllOutputsOff();
}

void redError() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(RED_LED_PIN, HIGH);
    tone(BUZZER_PIN, 400, 80);
    delay(120);
    digitalWrite(RED_LED_PIN, LOW);
  }
  setAllOutputsOff();
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!clockSynced) syncClock();
    return;
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    delay(250);
  }
  if (WiFi.status() == WL_CONNECTED) syncClock();
}

void readMode() {
  if (millis() - lastConfigRead < 1500) return;
  lastConfigRead = millis();
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String endpoint = String(API_HOST) + "/api/device/config";
  if (!beginApiRequest(http, endpoint)) {
    redError();
    return;
  }
  http.addHeader("X-Device-Api-Key", DEVICE_API_KEY);
  http.setTimeout(3000);
  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    currentMode = body.indexOf("\"mode\":\"registration\"") >= 0 ? "registration" : "attendance";
  }
  http.end();
}

String uidString() {
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void postScan(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) {
    redError();
    return;
  }

  HTTPClient http;
  String endpoint = currentMode == "registration"
    ? String(API_HOST) + "/api/rfid/pending"
    : String(API_HOST) + "/api/attendance/scan";
  if (!beginApiRequest(http, endpoint)) {
    http.end();
    redError();
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Api-Key", DEVICE_API_KEY);
  http.setTimeout(5000);

  String payload = "{\"uid\":\"" + uid + "\",\"device_id\":\"" + String(DEVICE_ID) + "\"}";
  int code = http.POST(payload);
  if (code < 0) {
    redError();
  } else {
    String body = http.getString();
    if (code == 201 && body.indexOf("\"status\":\"accepted\"") >= 0) {
      greenSuccess();
    } else if (body.indexOf("\"status\":\"duplicate\"") >= 0) {
      redDuplicate();
    } else if (body.indexOf("\"status\":\"unknown_card\"") >= 0 ||
               body.indexOf("\"status\":\"inactive_card\"") >= 0 ||
               body.indexOf("\"status\":\"pending_uid\"") >= 0) {
      if (body.indexOf("\"status\":\"pending_uid\"") >= 0) greenSuccess();
      else redUnknown();
    } else {
      redError();
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  setAllOutputsOff();

  SPI.begin();
  rfid.PCD_Init();
  secureClient.setCACert(ROOT_CA_CERT);
  connectWiFi();
  Serial.println(WiFi.status() == WL_CONNECTED ? "WiFi connected" : "WiFi unavailable");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  readMode();

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  if (millis() - lastScanMillis < scanCooldown) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(50);
    return;
  }

  lastScanMillis = millis();
  String uid = uidString();
  Serial.print("Card UID: ");
  Serial.println(uid);
  postScan(uid);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(100);
}
