function checkStatus() {
    if (Notification.permission == "granted") {
        $("#desktopNotificationStatusHolder").html("Enabled");
        $("#requestNotificationButton").hide();
    }
    else {
        $("#desktopNotificationStatusHolder").html("Disabled");
    }
}
$("#requestNotificationButton").on("click", function(){
    if (Notification.permission !== "granted") {
        Notification.requestPermission(function(){
            checkStatus();
        });
    }
});
checkStatus();