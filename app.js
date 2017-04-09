var restify = require("restify");
var builder = require("botbuilder");
var locationDialog = require("botbuilder-location");
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
                ll: place.geo.latitude + "," + place.geo.longitude,
                query: "Coffeeshops with WiFi",
                limit: 5,
                venuePhotos: 1,
                sortByDistance: 1
            };

            foursquare.exploreVenues(params, function (error, venues) {
                if (!venues.response.groups[0].items.length) {
                    session.send("I can't find anything here!");
                    return;
                }

                var carousel = venues.response.groups[0].items.map(function (element) {
                    console.log(JSON.stringify(element));
                    var venue = element.venue;
                    var name = venue.name;
                    var subtitle = venue.location.address + (venue.price ? `\n\nPrice: ${venue.price.message}` : "");
                    var image = venue.photos.groups.length && venue.photos.groups[0].items.length ? `${venue.photos.groups[0].items[0].prefix}600x600${venue.featuredPhotos.items[0].suffix}` : "";
                    var url = venue.url ? venue.url : `https://foursquare.com/v/${venue.id}`;
                    var mapUrl = `https://maps.google.com/maps?daddr=${venue.location.lat},${venue.location.lng}`;
                    return new builder.HeroCard(session)
                        .title(name)
                        .subtitle(subtitle)
                        .images([
                            builder.CardImage.create(session, image)
                                .tap(builder.CardAction.showImage(session, image))
                        ])
                        .buttons([
                            builder.CardAction.openUrl(session, url, "Website"),
                            builder.CardAction.openUrl(session, mapUrl, "Directions")
                        ]);
                });
                session.send(new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(carousel));

                session.beginDialog("/");
            });
        }
    }
]);
