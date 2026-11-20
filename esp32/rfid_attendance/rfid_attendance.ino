#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// Replace these values locally before uploading. Do not commit real credentials.
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_HOST = "http://192.168.1.100:5000";
const char* DEVICE_ID = "esp32-main";

#define RC522_SS_PIN 5
#define RC522_RST_PIN 27
#define GREEN_LED_PIN 12
#define RED_LED_PIN 14
#define BUZZER_PIN 13

MFRC522 rfid(RC522_SS_PIN, RC522_RST_PIN);
String currentMode = "attendance";
unsigned long lastConfigRead = 0;
unsigned long lastScanMillis = 0;
const unsigned long scanCooldown = 2500;

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
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    delay(250);
  }
}

void readMode() {
  if (millis() - lastConfigRead < 1500) return;
  lastConfigRead = millis();
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(API_HOST) + "/api/device/config");
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
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
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
