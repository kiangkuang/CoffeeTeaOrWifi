var restify = require("restify");
var builder = require("botbuilder");
var locationDialog = require('botbuilder-location');
var foursquare = (require("foursquarevenues"))(process.env.FS_CLIENTIDKEY, process.env.FS_CLIENTSECRETKEY);

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log("%s listening to %s", server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post("/api/messages", connector.listen());

bot.library(locationDialog.createLibrary(process.env.BING_MAPS_API_KEY));

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog("/", [
    function (session) {
        var options = {
            prompt: "Which area should I search?",
            useNativeControl: true,
            skipConfirmationAsk: true
        };

        locationDialog.getLocation(session, options);
    },
    function (session, results) {
        if (results.response) {
            var place = results.response;
            console.log(place);

            var params = {
                query: "Cafes with WiFi",
                limit: 5,
                venuePhotos: 1
            };

            params.ll = place.geo.latitude + "," + place.geo.longitude;

            foursquare.exploreVenues(params, function (error, venues) {
                //console.log(JSON.stringify(venues));

                if (!venues.response.groups[0].items.length) {
                    session.send("I can't find anything here!");
                    return;
                }

                var attachments = venues.response.groups[0].items.map(function (element) {
                    console.log(JSON.stringify(element));
                    var image = element.venue.featuredPhotos.items.length ? `${element.venue.featuredPhotos.items[0].prefix}original${element.venue.featuredPhotos.items[0].suffix}` : "";
                    var url = element.venue.url ? element.venue.url : `https://foursquare.com/v/${element.venue.id}`;
                    var mapUrl = `https://maps.google.com/maps?daddr=${element.venue.location.lat},${element.venue.location.lng}`;
                    var subtitle = element.venue.location.address + (element.venue.price ? `\n\nPrice: ${element.venue.price.message}` : "");
                    return new builder.HeroCard(session)
                        .title(element.venue.name)
                        .subtitle(subtitle)
                        .images([
                            builder.CardImage.create(session, image)
                                .tap(builder.CardAction.openUrl(session, url))
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, url, "Website"),
                            builder.CardAction.openUrl(session, mapUrl, "Directions")
                        ]);
                });
                session.send(new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(attachments));
            });
        }
    }
]);
