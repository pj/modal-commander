#include <napi.h>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#import <AppKit/NSScreen.h>
#import <AppKit/NSWindow.h>
#import <ApplicationServices/ApplicationServices.h>  // For AXValue functions
#import <CoreFoundation/CoreFoundation.h>
#import <Carbon/Carbon.h>  // For AXValueCreate

// Helper to convert CGRect to JavaScript object
Napi::Object CGRectToObject(Napi::Env env, CGRect rect) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("x", rect.origin.x);
    obj.Set("y", rect.origin.y);
    obj.Set("width", rect.size.width);
    obj.Set("height", rect.size.height);
    return obj;
}

Napi::Value getMonitors(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    NSArray* screens = [NSScreen screens];
    NSUInteger count = [screens count];
    
    Napi::Array monitorsArray = Napi::Array::New(env, count);
    
    for (NSUInteger i = 0; i < count; i++) {
        NSScreen* screen = [screens objectAtIndex:i];
        NSRect frame = [screen frame];
        
        Napi::Object monitor = Napi::Object::New(env);
        monitor.Set("id", static_cast<int>(i));
        
        Napi::Object bounds = Napi::Object::New(env);
        bounds.Set("x", frame.origin.x);
        bounds.Set("y", frame.origin.y);
        bounds.Set("width", frame.size.width);
        bounds.Set("height", frame.size.height);
        
        monitor.Set("bounds", bounds);
        monitor.Set("main", (screen == [NSScreen mainScreen]));
        
        // Convert NSString to C string for the monitor name
        NSString* localizedName = [screen localizedName];
        const char* name = [localizedName UTF8String];
        monitor.Set("name", name);
        
        monitorsArray[i] = monitor;
    }
    
    return monitorsArray;
}

Napi::Value getWindows(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID);
    
    if (!windowList) {
        return Napi::Array::New(env, 0);
    }
    
    CFIndex count = CFArrayGetCount(windowList);
    Napi::Array windowsArray = Napi::Array::New(env, static_cast<uint32_t>(count));
    
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef window = (CFDictionaryRef)CFArrayGetValueAtIndex(windowList, i);
        Napi::Object windowObj = Napi::Object::New(env);
        
        // Get window ID
        CFNumberRef windowId;
        if (CFDictionaryGetValueIfPresent(window, kCGWindowNumber, (const void**)&windowId)) {
            int wid;
            CFNumberGetValue(windowId, kCFNumberIntType, &wid);
            windowObj.Set("id", wid);
        }
        
        // Get window owner name
        CFStringRef ownerName;
        if (CFDictionaryGetValueIfPresent(window, kCGWindowOwnerName, (const void**)&ownerName)) {
            char name[256];
            CFStringGetCString(ownerName, name, 256, kCFStringEncodingUTF8);
            windowObj.Set("application", name);
        }
        
        // Get window name
        CFStringRef windowName;
        if (CFDictionaryGetValueIfPresent(window, kCGWindowName, (const void**)&windowName)) {
            char name[256];
            CFStringGetCString(windowName, name, 256, kCFStringEncodingUTF8);
            windowObj.Set("name", name);
        }
        
        // Get window bounds
        CFDictionaryRef bounds;
        if (CFDictionaryGetValueIfPresent(window, kCGWindowBounds, (const void**)&bounds)) {
            CGRect rect;
            CGRectMakeWithDictionaryRepresentation(bounds, &rect);
            windowObj.Set("bounds", CGRectToObject(env, rect));
        }
        
        windowsArray[static_cast<uint32_t>(i)] = windowObj;
    }
    
    CFRelease(windowList);
    return windowsArray;
}

Napi::Value setWindowBounds(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsObject()) {
        Napi::TypeError::New(env, "Expected window ID and bounds object").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    int targetWindowId = info[0].As<Napi::Number>().Int32Value();
    Napi::Object bounds = info[1].As<Napi::Object>();
    
    CGRect newBounds = CGRectMake(
        bounds.Get("x").As<Napi::Number>().DoubleValue(),
        bounds.Get("y").As<Napi::Number>().DoubleValue(),
        bounds.Get("width").As<Napi::Number>().DoubleValue(),
        bounds.Get("height").As<Napi::Number>().DoubleValue()
    );

    // Get all windows
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID);
    
    if (!windowList) {
        return env.Null();
    }

    CFIndex count = CFArrayGetCount(windowList);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef window = (CFDictionaryRef)CFArrayGetValueAtIndex(windowList, i);
        
        // Get window ID
        CFNumberRef windowId;
        if (CFDictionaryGetValueIfPresent(window, kCGWindowNumber, (const void**)&windowId)) {
            int wid;
            CFNumberGetValue(windowId, kCFNumberIntType, &wid);
            
            if (wid == targetWindowId) {
                // Found our window, set its bounds
                AXUIElementRef app = NULL;
                CFStringRef ownerName;
                if (CFDictionaryGetValueIfPresent(window, kCGWindowOwnerName, (const void**)&ownerName)) {
                    // Get the process ID for the window
                    pid_t pid;
                    CFDictionaryRef ownerPID;
                    if (CFDictionaryGetValueIfPresent(window, kCGWindowOwnerPID, (const void**)&ownerPID)) {
                        CFNumberGetValue((CFNumberRef)ownerPID, kCFNumberIntType, &pid);
                        
                        // Create an accessibility element for the application
                        app = AXUIElementCreateApplication(pid);
                        if (app) {
                            // Get all windows for the application
                            CFArrayRef appWindows;
                            if (AXUIElementCopyAttributeValue(app, 
                                                            kAXWindowsAttribute, 
                                                            (CFTypeRef*)&appWindows) == kAXErrorSuccess) {
                                // Find our specific window
                                CFIndex windowCount = CFArrayGetCount(appWindows);
                                for (CFIndex j = 0; j < windowCount; j++) {
                                    AXUIElementRef windowRef = (AXUIElementRef)CFArrayGetValueAtIndex(appWindows, j);
                                    
                                    // Set the position
                                    CGPoint position = CGPointMake(newBounds.origin.x, newBounds.origin.y);
                                    CFTypeRef positionValue = AXValueCreate((AXValueType)kAXValueCGPointType, static_cast<const void*>(&position));
                                    AXUIElementSetAttributeValue(windowRef, kAXPositionAttribute, positionValue);
                                    if (positionValue) CFRelease(positionValue);
                                    
                                    // Set the size
                                    CGSize size = CGSizeMake(newBounds.size.width, newBounds.size.height);
                                    CFTypeRef sizeValue = AXValueCreate((AXValueType)kAXValueCGSizeType, static_cast<const void*>(&size));
                                    AXUIElementSetAttributeValue(windowRef, kAXSizeAttribute, sizeValue);
                                    if (sizeValue) CFRelease(sizeValue);
                                }
                                CFRelease(appWindows);
                            }
                            CFRelease(app);
                        }
                    }
                }
                break;
            }
        }
    }
    
    CFRelease(windowList);
    return env.Null();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("getMonitors", Napi::Function::New(env, getMonitors));
    exports.Set("getWindows", Napi::Function::New(env, getWindows));
    exports.Set("setWindowBounds", Napi::Function::New(env, setWindowBounds));
    return exports;
}

NODE_API_MODULE(WindowFunctions, Init) 