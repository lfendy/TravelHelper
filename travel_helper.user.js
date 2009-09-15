// ==UserScript==
// @name           flight confirmation helper 
// @namespace      com.thoughtworks.travel
// @description    add email friendly text to qantas and virgin flight confirmation pages.
// @include        https://book.qantas.com.au/*
// @include        http://book.qantas.com.au/*
// @include        https://bookings.virginblue.com.au/*
// @include        http://*.e-travel.com/*
// ==/UserScript==

// this script is trying to read flight confirmation web pages and create a textual representation that jacqui can copy to an email
// Reference: YBE9HY
// ---------------------------------------------------------------------
// Travel Itinerary For:
//                    Danielle McBride 
// ---------------------------------------------------------------------

// Thursday  Qantas AIRWAYS             FLIGHT QF414
// 22 November 07 - DEPART   - MELBROURNE/MELBOURNE INTL  	0800
//                        Terminal: TERMINAL 1
// 22 November 07 - ARRIVE   - SYDNEY/SYDNEY KINGSFORD   	0920     
// 				Terminal: TERMINAL

// 10/10/2008 - Now this script also has functionality to insert data directly into a google spreadsheet
// 14/11/2008 - Updated script to work with new qantas layout
Array.prototype.reduce = function (fn, init) {
        var s = init;
        for (var i = 0; i < this.length; i++) {
            s = fn( s, this[i] );
	}
        return s;
}
 
function convertDddToDayOfWeek(ddd) {
    this.Mon = 'Monday';
    this.Tue = 'Tuesday';
    this.Wed = 'Wednesday';
    this.Thu = 'Thursday';
    this.Fri = 'Friday';
    this.Sat = 'Saturday';
    this.Sun = 'Sunday';
    if (this[ddd] == null) {
	    GM_log('i dont understand the day' + ddd);
    }
    return this[ddd];
}

var months = new Array("January","February","March","April","May","June","July","August","September","October","November","December");
var days = new Array("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday");

function convertMmmToMonth(mmm) {
	this.Jan = 'January';
	this.Feb = 'February';
	this.Mar = 'March';
	this.Apr = 'April';
	this.May = 'May';
	this.Jun = 'June';
	this.Jul = 'July';
	this.Aug = 'August';
	this.Sep = 'September';
	this.Oct = 'October';
	this.Nov = 'November';
	this.Dec = 'December';
        if (this[mmm] == null) {
	    GM_log('i dont understand the month ' + mmm);
        }
	return this[mmm];
}

//IN: DayOfWeek, Day Mmm Yy
//OUT: Day Month Year
function convertdayddMmmyyToddMyyyy(date) {
	date = date.substring(date.indexOf(',') + 1); // Remove day of week
	return date.substring(1,4) + convertMmmToMonth(date.substring(4,7)) + ' 20' + date.substring(8);
}

//IN: Day Month Year
//OUT: Date object
function getDateObjectFromFlightDate(date) {
  var theDate = new Date();
  var elements = date.split(' ');
  theDate.setTime(Date.parse(elements[1] + ', ' + elements[0] + ' ' + elements[2] + ' 00:00:00'));
  return theDate;
}

function destination(city, airport, terminal, address) {
    this.city = city;
    this.airport = airport;
    this.terminal = terminal;
    this.address = address;
}

function lookupDestination(dest) {
	this.Melbourne = new destination('Melbourne', 'Melbourne Domestic Airport', 'TERMINAL 1', 'Melbourne Domestic Airport');
	this['Melbourne (Tullamarine)'] = this.Melbourne;
	this.Sydney = new destination('Sydney', 'Sydney Domestic Airport', 'TERMINAL 3', 'Sydney Domestic Airport');
	this.Brisbane = new destination('Brisbane', 'Brisbane Domestic Airport', 'TERMINAL ?????', 'Brisbane Domestic Airport');
	this.Adelaide = new destination('Adelaide', 'Adelaide Domestic Airport', 'TERMINAL ?????', 'Adelaide Domestic Airport');
	this.Perth = new destination('Perth', 'Perth Airport', 'TERMINAL ?????', 'Perth Airport');
	this.Hobart = new destination('Hobart', 'Hobart Airport', 'TERMINAL ?????', 'Hobart Airport');
	this.Canberra = new destination('Canberra', 'Canberra Airport', 'TERMINAL ?????', 'Canberra Airport');
        if (this[dest] == null) {
            GM_log('destination ' + dest + ' is not supported!');
        }
	return this[dest];
}

function FlightPoint() {
	this.name = '?(Depart/Arrive)';
	this.date = '?';
	this.time = '?';
	this.dest = new destination('?','?');
	this.carId = '?';
}

var flightIdCounter = 1;
function Flight() {
    this.id = 'f' + flightIdCounter++;
    this.dayofweek = '?';
    this.airline = '?';
    this.flightno = '?';
    this.accommodationBookingId = '?';
	this.price = '?';
	this.flightPrice = function() { //Calc flight cost by divide total cost by journeys
	  if(this.price == '?') {
	    totalPrice = this.totalPrice.split(' ').join('').split('$').join('');
		return totalPrice / this.flightPoints.length;
		}
	  else
	    return this.price;
	  };
	this.totalPrice = '?';
	this.bookingDate = '?';
    this.flightPoints = new Array();
    this.startPoint = function () {return this.flightPoints[0];};
    this.endPoint = function () {return this.flightPoints[this.flightPoints.length-1];};
}

// returns a snapshot set
function scrape(xpath, dom) {
    var elements = document.evaluate(xpath, dom, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var elementArray = new Array();
    for (var i=0; i<elements.snapshotLength; i++) {
        elementArray.push(elements.snapshotItem(i));
    }
    return elementArray; 
}

function containsText(string, dom) {
	return scrape("//*[contains(.,'" + string+ "')]", document).length > 0;
}

function scrapeText(xpath, dom) {
    var result = scrape(xpath, dom);
    var first = result[0];
    if (first == null) {
         throw('failed to find text for the query ' + xpath + '\n' + 'with the dom: ' + new XMLSerializer().serializeToString(dom));
    }
    return first.textContent;
}

function scrapeTextLast(xpath, dom) {
    var result = scrape(xpath, dom);
    var last = result[result.length - 1];
    return last.textContent;
}

function scrapeFirst(xpath, dom) {
    var result = scrape(xpath, dom);
    var first = result[0];
    return first;
}

function convert12HourTo24Hour (twelveHour) {
    var fixed = twelveHour.replace(' am','');
    fixed = fixed.replace(':','');
    fixed = fixed.replace(' ','');
    return fixed;
}

function convertDdMmmYyToDdMonthYy(ddMmmYy, seperator) {
    var tokens = ddMmmYy.split(seperator);
    dd = tokens[0];
    month = convertMmmToMonth(tokens[1]);
    yy = tokens[2];
    // GM_log('dd:' + dd + ' mmm:' + tokens[1] + ' month:' + convertMmmToMonth(tokens[1]) + ' yy:' + tokens[2]);
    return dd + ' ' + month + ' 20' + yy;
}

function repeat(str, times) {
    result = str;
    for (i=1;i<times;i++) {
       result += str; 
    }
    return result;
}

function trim(theString) {
    return theString.replace(/^\&nbsp;/,'').replace(/\&nbsp;$/,'').replace(/^\s*/,'').replace(/\s*$/,'');
}
function convertDateToDdMmmYyyy(date) {
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
}


function convertDateToDayDdMmmYyyy(date) {
    return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
}

function padNumber(theNumber) {
    var theString = theNumber + '';
    if (theString.length == 1) {
        theString = '0' + theString;
    }
    return theString;
}

function convertDateToHhMm(date) {
    var hours = padNumber(date.getHours());
    var minutes = padNumber(date.getMinutes());
    return hours + ':' + minutes;
}

var daysAwayStoredValues = new Array();
var switchInOutDaysAway = function(event) {
  var idNumber = event.target.id.substring(5);
  var checkElement = document.getElementById('check' + idNumber);
  var tdElement = document.getElementById('daysAway' + idNumber);

  if(checkElement.checked) { 
	daysAwayStoredValues[idNumber] = tdElement.innerHTML;
    tdElement.innerHTML = '';
  } else {
	tdElement.innerHTML = daysAwayStoredValues[idNumber];
  }
}


var refreshEmail = function() {
	// update contact details
	var mobileNo = document.getElementById('mobileNo').value;
        var emailMobileNo = document.getElementById('emailMobileNo');
	if (mobileNo.length > 0) {
	    emailMobileNo.innerHTML = '(' + mobileNo + ')';
	}
	else {
            emailMobileNo.innerHTML = '';
	}
        //update from accommodation and cars
        var personName = document.getElementById('personname').innerHTML;
        var accommodation = scrape("//div[@id = 'accommodation']/div", document);
        accommodation.forEach(function(accommodationBooking) {
            var preview = document.getElementById('email' + accommodationBooking.id);
            GM_log('accommodationBooking:' + accommodationBooking.innerHTML);
            var hotelInfo = scrapeFirst("./*[@name = 'hotel']", accommodationBooking).value.split('&');
            var hotelName = hotelInfo[0];
            var hotelAddress = hotelInfo[1];
            var hotelPhone = hotelInfo[2];
            var checkInDate = scrapeFirst("./*[@name = 'checkIn']", accommodationBooking).value;
            var checkOutDate = scrapeFirst("./*[@name = 'checkOut']", accommodationBooking).value;
            var roomType = scrapeFirst("./*[@name = 'roomType']", accommodationBooking).value;
            var rate = '$' + scrapeFirst("./*[@name = 'rate']", accommodationBooking).value;
            var paid = scrapeFirst("./*[@name = 'paid']", accommodationBooking).value == 'true';
       	    var reservationNo = scrapeFirst("./*[@name = 'reservationNo']", accommodationBooking).value;
	    // don't show the hotel if there isn't a confirmation
	    if (reservationNo.length > 0) {
	        preview.innerHTML = '<b>Accommodation at ' + hotelName + '</b><br/>' + 
                                 'Address:' + hotelAddress + '<br/>' + 
				 'Check In: ' + checkInDate + '<br/>' +
				 'Check Out: ' + checkOutDate + '<br/>' + 
//				 'Guest Name: ' + personName + '<br/>' +
//				 'Room Type: ' + roomType + '<br/>' + 
				 'Rate: ' + rate + ' per night' + (paid ? '' : ' - Please pay on Departure') + '<br/>' +
				 'Reservation No: ' + reservationNo + '<br/><br/>';
	    }
	    else {
		    preview.innerHTML = '';
	    }
            // update call hotel link
            var callHotelLink = document.getElementById('callHotel');
	    callHotelLink.innerHTML = 'call ' + hotelPhone;
	    callHotelLink.href = 'skype:' + hotelPhone + '?call';
	});
        var cars = scrape("//div[@id = 'cars']/div", document);
	spreadsheetContents = '';
	spreadsheetContents = '<tr><td>Name</td><td>To</td><td>From</td><td>Date</td><td>Time</td><td>Project Code</td></tr>';
	cars.forEach(function(car) {
             var preview = document.getElementById('email' + car.id);
			 
			 preview.innerHTML = '';
			 
	     GM_log('id: ' + car.id + ' carPreview: ' + car.innerHTML);
		 var suburbNode = scrapeFirst("./b[@name = 'suburb'] | ./input[@name = 'suburb']", car);
		 var suburb = suburbNode.value;

	     var fromNode = scrapeFirst("./b[@name = 'from'] | ./input[@name = 'from']", car);
	     var from = '';
	     if (fromNode.tagName == 'B') {
	         from = fromNode.innerHTML;
             }
	     else {
	         from = fromNode.value
			 if(suburb != "")
			   from += " " + suburb;
	     }
             var toNode = scrapeFirst("./b[@name = 'to'] | ./input[@name = 'to']", car);
	     var to = '';
	     if (toNode.tagName == 'B') {
	         to = toNode.innerHTML;
             }
	     else {
	         to = toNode.value
			 if(suburb != "")
			   to += " " + suburb;
	     }
	     var carFlightBufferMin = scrapeFirst("../input[@name = 'buffer']", car).value;
	     var flightDate = document.getElementById(car.id + 'date').value;
             differenceMillis = 0;
             if (to.search(/Airport/) > -1) {
	         var estimatedMin = scrapeFirst("./input[@name = 'estimate']", car).value;
	         var estimatedMillis = new Number(estimatedMin) * 1000 * 60;
                 differenceMillis = 0 - estimatedMillis - (new Number(carFlightBufferMin) * 1000 * 60);
	     }
	     var carPickUp = new Date(new Number(flightDate) + differenceMillis);
	     var carPickUpDate = convertDateToDayDdMmmYyyy(carPickUp);
	     var carPickUpSpreadsheetDate = convertDateToDdMmmYyyy(carPickUp);
	     var carPickUpTime = convertDateToHhMm(carPickUp);
	     GM_log(flightDate + 'date:' + carPickUpDate);
		 var projectCode = scrapeFirst("//input[@name='projectCode']", document).value;
	     //scrapeText("./div[name = 'from']",preview);

	     if (from.length * to.length > 0) {

			     var suburbLine = '<td style="background-color: white;padding-left:10px;padding-right:10px;">' + suburb + '</td>';
                 if(from.match("Airport") != null) { // Otherwise to contains "Airport"
					destFields = suburbLine + '<td style="background-color: white;padding-left:10px;padding-right:10px;">' + from + '</td>';
					toSuburb = suburb;
					fromSuburb = '';
					}
				 else{ 
				    destFields = '<td style="background-color: white;padding-left:10px;padding-right:10px;">' + to + '</td>' + suburbLine;
					fromSuburb = suburb;
					toSuburb = '';
				 }
				 
				 preview.innerHTML = '<b>Car Transfer Time ' + ' ' + carPickUpTime + ' ' + carPickUpDate + '</b><br/>' + 
                     'From: ' + from + '<br/>' +
                     'To: ' + to + '<br/><br/>';				 

                 spreadsheetContents += '<tr><td style="background-color: white;padding-left:10px;padding-right:10px;">' + personName + '</td>' + 
					destFields +		
                    '<td style="background-color: white;padding-left:10px;padding-right:10px;">' + carPickUpSpreadsheetDate + '</td>' +  
                    '<td style="background-color: white;padding-left:10px;padding-right:10px;">' + carPickUpTime + '</td>' +
					'<td style="background-color: white;padding-left:10px;padding-right:10px;">' + projectCode + '</td>';
	     }
	});
        var spreadsheetTable = document.getElementById('spreadsheetTable');
        spreadsheetTable.innerHTML = spreadsheetContents;
		
		var flightTable = document.getElementById('spreadsheetFlightTable');
		var flightHTML = '';
		flightHTML += '<tr><td>Date</td><td>Name</td><td>From</td><td>To</td><td>Booking Date</td><td>Price</td><td>Project Code</td><td>Nights Away</td></tr>';
		for(var x = 0 ; x < itinerary.flights.length ; x++) {
		  var startPoint = itinerary.flights[x].startPoint();
		  var endPoint = itinerary.flights[x].endPoint();
		  flightHTML += '<tr>';
		  flightHTML += '<td>' + startPoint.date + '</td>';
		  flightHTML += '<td>' + itinerary.name + '</td>';
		  flightHTML += '<td>' + startPoint.dest.airport + '</td>';
		  flightHTML += '<td>' + endPoint.dest.airport + '</td>';
		  flightHTML += '<td>' + itinerary.flights[x].bookingDate + '</td>';
		  flightHTML += '<td>' + itinerary.flights[x].flightPrice() + '</td>';
		  //Project Code
		  var projectCode = scrapeFirst("//input[@name='projectCode']", document).value;
		  flightHTML += '<td>' + projectCode + '</td>';
		  //Calc days away
		  flightHTML += '<td id="daysAway' + x + '">';
		  var nextFlightIndex = x + 1;
		  if(nextFlightIndex < itinerary.flights.length) {
		    var startDate = startPoint.date;
			var nextTravelDate = itinerary.flights[nextFlightIndex].startPoint();
			nextTravelDate = nextTravelDate.date;
			var oneDay=1000*60*60*24;
			var daysAway = Math.ceil((getDateObjectFromFlightDate(nextTravelDate).getTime() - getDateObjectFromFlightDate(startDate).getTime()) / oneDay); 
			flightHTML += daysAway;
		  }
		  
		  flightHTML += '</td>';
		  flightHTML += '<td style="border: 0;">Travelling home?<input type="checkbox" id="check' + x + '" name="v" /></td>';
		  flightHTML += '</tr>';

		}
		flightTable.innerHTML = flightHTML;
		for(z = 0 ; z < itinerary.flights.length ; z++) {
		  var checkString = 'check' + z;
  		  document.getElementById(checkString).addEventListener("change", function(event) {switchInOutDaysAway(event)}, false);
		}

};

// takes time HHMM and makes it HH:MM
function prettyTime(time) {
	GM_log('the time is:' + time);
   return time.replace(/\s*(..)(..)\s*/, '$1:$2'); 
};

function Email() {
    this.itinerary = null;
    this.extraHtml = '';
    this.element = document.createElement("div");
    this.element.id = 'email';
    this.element.style.fontFamily = 'verdana'; 
    this.element.style.fontSize = '10pt'; 
    this.about = function (itinerary) {
        this.itinerary = itinerary;
        return this;
    };
    this.display = function (parentElement) {
        this.element.innerHTML += '<h2>Itinerary</h2>';
        this.element.innerHTML += '<b>Flight Booking Reference: </b>' + this.itinerary.bookingRef + '<br/>';
        this.element.innerHTML += '---------------------------------------------------------------------<br/>';
        this.element.innerHTML += 'Travel Itinerary For:<br/>';
        this.element.innerHTML += repeat('&nbsp;',28) + '<span id="personname">' + this.itinerary.name + '</span> <span id="emailMobileNo"></span><br/>';
        this.element.innerHTML += '---------------------------------------------------------------------<br/>';
        this.element.innerHTML += this.itinerary.flights.reduce(function (html, flight) {
            return html + 
	           '<div id="email' + flight.startPoint().carId + '"></div>' +
	           '<div id="email' + flight.id + '">' +
                   '<b>' + 
                   ' Flight Time ' + prettyTime(flight.flightPoints[0].time) + 
                   ' ' + flight.dayofweek +  
		   ' ' + flight.flightPoints[0].date + 
                   '</b>' +
		   '<br/>Flight No: ' + flight.airline + ' ' + flight.flightno + 
                   flight.flightPoints.reduce(function (html, flightpoint) {
                    return html +  
                           '<br/>' + 
                           flightpoint.name + ': ' +
                           flightpoint.date +  
                           ' ' + prettyTime(flightpoint.time) + 
                           ' - ' + flightpoint.dest.airport
                           }, '') +
	       '</div><br/>' +
	       '<div id="email' + flight.endPoint().carId + '"></div>' +
	       '<div id="email' + flight.accommodationBookingId + '"></div>'; 
        }, '');
        this.element.innerHTML += this.itinerary.extraHtml; 
        this.element.innerHTML += '<div><p> For changes or cancellations <b>outside business hours</b> please contact airlines and drivers directly<br/>' + 
	       'via their website or the following numbers.</p></div>' +
               '<p><b>AIRLINES</b><br/>' +
               'Qantas 13 13 13<br/>' +
               'Virgin Blue 13 67 89</p>' +  
               '<p><b>CAR SERVICES</b><br/>' +
               'Melbourne 0412 932 628<br/>' +
               'Sydney  0413 333 663<br/>' +
               'Brisbane 07 3353 0644</div>' +
               '<div><p>When travelling for ThoughtWorks you are covered by <a href="http://www.covermore.com.au">CoverMore Travel Insurance</a><br/>Account Name:ThoughtWorks Australia Pty Ltd<br/>Policy Number:5359888</p></div>'+
               '<div><p><b>Got Feedback?</b> How was your travel today? Were the timings appropriate? Did everything go smoothly?<br/>Please let Jacqui know of any feedback you have to help us provide the best travel service we can.</p></div>'
	parentElement.appendChild(this.element); 
    }
}

function Spreadsheet() {
    this.itinerary = null;
    this.element = document.createElement("div");
    this.element.id = 'spreadsheet';
    this.element.style.fontFamily = 'verdana'; 
    this.element.style.fontSize = '10pt'; 
    this.about = function (itinerary) {
        this.itinerary = itinerary;
        return this;
    };
    this.display = function (parentElement) {
        this.element.innerHTML += '<h2>Spreadsheet</h2>';
		this.element.innerHTML += '<h3>Travel Details</h3>';
        this.element.innerHTML += '<table cellspacing="0" cellpadding="0" border="1px" id="spreadsheetTable"/>';
		this.element.innerHTML += '<br/>';
		parentElement.appendChild(this.element); 
    };
	
	this.displayFlight = function (parentElement) {
	    this.element.innerHTML += '<p>Project Code: <input type="text" name="projectCode" id="projectCode" /></p>';
		this.element.innerHTML += '<h3>Flight Details</h3>';
        this.element.innerHTML += '<table cellspacing="0" cellpadding="0" border="1px" id="spreadsheetFlightTable"/>';
		this.element.innerHTML += '<br/>';
	    document.getElementById('projectCode').addEventListener("change", refreshEmail, false);
		
    };

}

function Contact() {
    this.itinerary = null;
    this.element = document.createElement("div");
    this.element.id = 'contact';
    this.about = function (itinerary) {
        this.itinerary = itinerary;
        return this;
    };
    this.display = function (parentElement) {
        this.element.innerHTML += '<h2>Contact Details for ' + itinerary.name + '</h2>';
        this.element.innerHTML += 'mobile: <input size="12" id="mobileNo" value="' + itinerary.phone + '"/><br/>';
	parentElement.appendChild(this.element); 
    };
}

function Map() {
    this.element = document.createElement("div");
    this.element.id = 'map';
//    this.element.style.position = 'absolute'; 
 
    this.display = function () {
        this.element.innerHTML += '<iframe width="300" height="300" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="http://maps.google.com/maps?f=d&amp;hl=en&amp;geocode=&amp;time=&amp;date=&amp;ttype=&amp;saddr=Melbourne+Airport,+VIC,+Australia&amp;daddr=Box+Hill,+VIC,+Australia&amp;sll=37.0625,-95.677068&amp;sspn=45.822921,85.078125&amp;ie=UTF8&amp;om=1&amp;s=AARTsJqsLQ2_X_ZZL8BeK0DghHIM6iwtdw&amp;ll=-37.743571,144.972839&amp;spn=0.325782,0.411987&amp;z=10&amp;output=embed"></iframe><br /><small><a href="http://maps.google.com/maps?f=d&amp;hl=en&amp;geocode=&amp;time=&amp;date=&amp;ttype=&amp;saddr=Melbourne+Airport,+VIC,+Australia&amp;daddr=Box+Hill,+VIC,+Australia&amp;sll=37.0625,-95.677068&amp;sspn=45.822921,85.078125&amp;ie=UTF8&amp;om=1&amp;ll=-37.743571,144.972839&amp;spn=0.325782,0.411987&amp;z=10&amp;source=embed" style="color:#0000FF;text-align:left">View Larger Map</a></small>';
        this.element.innerHTML += 'http://maps.google.com/maps?f=d&hl=en&geocode=&time=&date=&ttype=&saddr=Melbourne+Airport,+VIC,+Australia&daddr=Box+Hill,+VIC,+Australia&sll=38.0625,-95.677068&sspn=45.822921,85.078125&ie=UTF8&om=1&ll=-37.743571,144.972839&spn=0.325782,0.411987&z=10&source=embed';
	document.body.insertBefore(this.element, document.body.firstChild); 
    }
}
// qantas stuff
function QantasConfirmationBuilder() {
    this.pageTitle = 'Flight Bookings - Confirmation';
    this.isBuildable = function () {
        try {
		if (scrapeText("id('copyright')", document).search('Qantas') >= 0) {
			if (scrapeText('//head/title', document) == this.pageTitle) {
				return true;
			}
		}
        } catch (ex) {}
        return false;
    };

    this.flightQuery = "id('business')/div[2]/div/table/tbody/tr/td[@class = 'checkin']/..";
    this.flightParser = function (flightnode) {
        flight = new Flight();
        //GM_log('qantas' + flightnode.innerHTML);
        flight.airline = 'Qantas Airlines';
        flight.flightno = scrapeText('./td[6]', flightnode);
        var header = scrapeText('./td[1]',flightnode).split(' ');
        var ddd = header[0];
        flight.dayofweek = convertDddToDayOfWeek(ddd);
		flight.totalPrice = scrapeText("id('price')/div/table/tbody/tr/td[4]", document);
		flight.bookingDate = new Date().toUTCString().substring(0,12) + new Date().toUTCString().substring(14,16);
        return flight;
    };
    this.flightPointQuery = './td[position() = 2 or position() = 4]';
    this.flightPointParser = function (flightpointnode) {
                fp = new FlightPoint();
                fp.name = (flightpointnode.cellIndex == 1) ? 'Depart' : 'Arrive';
		var rawDest = flightpointnode.nextSibling.nextSibling.textContent;
		rawDest = trim(rawDest);
                fp.dest = lookupDestination(rawDest);
                var rawtime = scrapeText('./strong', flightpointnode);
                fp.time = convert12HourTo24Hour(rawtime);
                var rawdate = scrapeText('../td[1]', flightpointnode).replace(' ', '');
                rawdate = rawdate.substr(3,rawdate.length-3);
                fp.date = convertDdMmmYyToDdMonthYy(rawdate, ' ');
                return fp;
        };

    this.parseBookingRef = function () {
        return scrapeText("id('title')/*/em", document);
    };
    this.parseName = function () {
        var name = scrapeText("id('business')/div[1]/div/div[2]/table/tbody/tr[2]/td/strong", document);
        return name.split(' ').filter(function (word, index) {return index > 1;}).join(' ');
    };
    this.parsePhone = function () {
         var phone = scrapeText("id('business')/div[1]/div/div[2]/table/tbody/tr[3]/td[2]", document);
	 return phone;
         // return phone.split(' ').filter(function (word, index) {return index > 1;}).join(' ');
    }
    // build link for booking reference web page
    this.parseExtra = function() {
        var reference = this.parseBookingRef(); 
        var surname = scrapeText("id('business')/div[1]/div/div[2]/table/tbody/tr[2]/td/strong", document).split(' ')[3];
        var link = 'http://www.qantas.com.au/regions/do/dyn/checkmytrip?bookingRef=' + reference + '&surname=' + surname;
        return '<a href="' + link + '">lookup your booking on the interwebs</a><br/><br/>';
    };
	
}

// I have a feeling this function is never used, the QantasConfirmationBuiler always gets priority
function QantasManageBuilder() {
    this.parentQantas = new QantasConfirmationBuilder();
    this.pageTitle = 'Booking - Details';
    this.isBuildable = this.parentQantas.isBuildable;
    this.parseBookingRef = this.parentQantas.parseBookingRef;
    this.parseName = this.parentQantas.parseName;
    this.parsePhone = this.parentQantas.parsePhone;
    this.parseExtra = this.parentQantas.parseExtra;

    this.flightQuery = "id('business')/div[2]/div/table/tbody/tr/td[@class = 'baggage']/..";
    this.flightParser = function (flightnode) {
        flight = new Flight();
        //GM_log('qantas' + flightnode.innerHTML);
        flight.airline = 'Qantas Airlines';
        flight.flightno = trim(scrapeText('./td[6]/a', flightnode));
        var header = scrapeText('./td[1]',flightnode).split(' ');
        var ddd = header[0];
        flight.dayofweek = convertDddToDayOfWeek(ddd);
        return flight;
    };
    this.flightPointQuery = './td[position() = 2 or position() = 4]';
    this.flightPointParser = function (flightpointnode) {
                fp = new FlightPoint();
                fp.name = (flightpointnode.cellIndex == 1) ? 'Depart' : 'Arrive';
                var rawDest = flightpointnode.nextSibling.nextSibling.textContent;
                rawDest = trim(rawDest);
                fp.dest = lookupDestination(rawDest);
                var rawtime = scrapeText('./strong', flightpointnode);
                fp.time = convert12HourTo24Hour(rawtime);
                var rawdate = scrapeText('../td[1]', flightpointnode).replace(' ', '');
                rawdate = rawdate.substr(3);
                fp.date = convertDdMmmYyToDdMonthYy(trim(rawdate), ' ');
                return fp;
        };
}

// virgin stuff
function VirginPaymentBuilder() {
    this.isBuildable = function () {
        try {
            if (scrapeText("id('content')/div/div[3]/ul/li[1]", document).search('.*Virgin.*') >= 0) {
                if (scrapeFirst("//body", document).id == 'payment') {
                    return true;
                }
            }
            return false; 
        } catch (ex) {
            GM_log(ex);
            return false;
        }
    };

    this.flightQuery = "//div[./table/tbody/tr/th[1]/span='Departing']";
    this.flightParser = function (element) {
        var flight = new Flight();
        flight.airline = 'Virgin Airlines';
        flight.flightno = scrapeText('./table/tbody/tr[2]/td[3]/span', element).replace(' ','');
		flight.price = scrapeText('./table/tbody/tr[2]/td[5]/span', element).substring(1);
        var header = scrapeText('preceding::*[2]',element).split(' ');
        var ddd = header[header.length - 3];
        flight.dayofweek = convertDddToDayOfWeek(ddd);
		flight.bookingDate = scrapeText("//div['@id=itinInfoPanel']//div[@class='booking-conf-data' and position()=2]",element);
        return flight;
    };

    this.flightPointQuery = './table/tbody/tr/td[position() = 1 or position() = 2]/span/..';
    this.flightPointParser = function (element) {
        fp = new FlightPoint();
        fp.name = (element.cellIndex == 0) ? 'Depart' : 'Arrive';
        fp.dest = lookupDestination(scrapeText('./span[2]', element));
        var rawtime = scrapeText('./span[1]/strong', element);
        fp.time = convert12HourTo24Hour(rawtime);
        fp.date = convertDdMmmYyToDdMonthYy(scrapeText('./span[3]', element), '-');
	//GM_log('time:' + fp.time);
	//GM_log('date:' + fp.date + 'raw:' + scrapeText('./span[3]', element));
        return fp;
    };

    this.parseBookingRef = function () {
        return '';
    };
    this.parseName = function () {
        return '';
    };
    this.parsePhone = function () {
        return '';
    };

}

function VirginItineraryBuilder() {
    this.isBuildable = function () {
        try {
            if (containsText('Virgin Blue Airlines', document)) {
                if (containsText('Booking Information') || containsText('Booking Confirmation')) {
                    return true;
                }
            }
            return false; 
        } catch (ex) {
            GM_log(ex);
            return false;
        }
    };
    this.virginPaymentBuilder = new VirginPaymentBuilder();
    this.flightQuery = this.virginPaymentBuilder.flightQuery;
    this.flightParser = function (element) {
        var flight = this.virginPaymentBuilder.flightParser(element);
        var header = scrapeText("preceding-sibling::div[position()=1]//label[@class='middle']",element).split(' ');
        var ddd = header[header.length - 3];
        flight.dayofweek = convertDddToDayOfWeek(ddd);
        return flight;
    };
    this.flightPointQuery = this.virginPaymentBuilder.flightPointQuery;
    this.flightPointParser = this.virginPaymentBuilder.flightPointParser;
    this.parseBookingRef = function () {
	return scrapeText("//div//*[preceding-sibling::div[ @class='booking-conf-label' and (contains(.,'Reservation') or contains(.,'Confirmation Number'))]]", document);
    };
    this.parseName = function () {
        return scrapeText("id('payPassenger')/p", document);
    };
    this.parsePhone = function () {
		var rawPhone = scrape("//form[@name = 'itinerary_info']/input[@name = 'contact_phone']", document)[0] || scrape("//div[@id='payContact']", document)[0];
		if(rawPhone.nodeName == "INPUT") {
			return rawPhone.value.replace(/(....)(...)(...)/, '$1 $2 $3');			
		}
		if(rawPhone.nodeName == "DIV") {
			return rawPhone.textContent.match(/(\d\d\d\d\d\d\d\d\d\d)/)[0];
		}
		return "could not locate phone information";
    };
	// build link for booking reference web page
    this.parseExtra = function() {
        var link = 'https://bookings.virginblue.com.au/skylights/cgi-bin/skylights.cgi?module=C3&page=PNR_LOOKUP';
        return '<a href="' + link + '">lookup your booking on the interwebs</a><br/><br/>';
    };
}

var MAX_DUMP_DEPTH = 10;
       function dumpObj(obj, name, indent, depth) {
              if (depth > MAX_DUMP_DEPTH) {
                     return indent + name + ": <Maximum Depth Reached>\n";
              }
              if (typeof obj == "object") {
                     var child = null;
                     var output = indent + name + "\n";
                     indent += "\t";
                     for (var item in obj)
                     {
                           try {
                                  child = obj[item];
                           } catch (e) {
                                  child = "<Unable to Evaluate>";
                           }
                           if (typeof child == "object") {
                                  output += dumpObj(child, item, indent, depth + 1);
                           } else {
                                  output += indent + item + ": " + child + "\n";
                           }
                     }
                     return output;
              } else {
                     return obj;
              }
       }

//var hotels = '<option value="Pacific International Suites&471 Little Bourke Street&+61396073000">Melbourne - Pacific International Suites</option>' +
//           '<option value="Medina Grand&189 Queen St Melbourne 3000&+61399340000">Melbourne - Medina Grand</option>' +
//           '<option value="Macarthur Chambers&201 Edward St Brisbane 4000&+61732219229">Brisbane - Macarthur Chambers</option>' +
//           '<option value="Radisson Plaza&27 O\'Connell St Sydney 2000&+61282140000">Sydney - Radisson Plaza</option>' +
//           '<option value="Menzies&14 Carrington St Sydney 2000&+61292991000">Sydney - Menzies</option>';
var hotels = new Object();

function handleGoogleSpreadsheetResult(result) {
    hotels = new Object();
    var cells = result.feed.entry;
    for (var i = 4; i < cells.length; i = i + 4) {
        row = [cells[i].content.$t,cells[i+1].content.$t,cells[i+2].content.$t,cells[i+3].content.$t];
	GM_log('city:' + row[0]);
        if (hotels[row[0]] == null) {
              hotels[row[0]] = '';
	}
        hotels[row[0]] += '<option value="' + row[1] + '&' + row[2] + '&' + row[3] + '">' + row[1] + '</option>';
        //GM_log(dumpObj(entry, '','    ',7));
        //GM_log('title:' + entry.title.$t);
        //GM_log('content:' + entry.content.$t);
    } 
    var hotelSelectBoxes = scrape("//div[@id = 'accommodation']/div/select[@name = 'hotel']", document);
    hotelSelectBoxes.forEach(function(selectBox) {
        var city = scrapeFirst("../input[@name = 'city']", selectBox).value;
	var hotel = hotels[city];
	if (hotel == null) {
            selectBox.innerHTML = '<option>no hotels found for the city ' + city + ' on the google spreadsheet :(</option>';
	}
	else {
            selectBox.innerHTML = hotel;
	}
    });

    refreshEmail();
}

function queryHotelsOnGoogleSpreadsheets() {
    queryGoogleSpreadsheet('pgZYLtdPRv50AK70fqJkQSw', 'od6', 'handleGoogleSpreadsheetResult');
}

function queryGoogleSpreadsheet(spreadsheetKey, gridId, callbackFunctionName) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'http://spreadsheets.google.com/feeds/cells/' + spreadsheetKey + '/' + gridId + '/public/basic?alt=json-in-script&callback=' + callbackFunctionName,
        headers: {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
        },
        onload: function(responseDetails) {
	    eval(responseDetails.responseText);
        },
    });
}

function queryGoogleMap(origin, destination, successCallback, errorCallback) {
var fullOrigin = origin.replace(' ','+') + ',Australia';
var fullDest = destination.replace(' ','+') + ',Australia';
GM_xmlhttpRequest({
        method: 'GET',
        url: 'http://maps.google.com/maps?f=d&hl=en&geocode=&time=&date=&ttype=&saddr=' + fullOrigin + '&daddr=' + fullDest,
	// + '&sll=37.0625,-95.677068&sspn=45.822921,85.078125&ie=UTF8&om=1&ll=-37.743571,144.972839&spn=0.718891,1.329346&z=10',
        headers: {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
        },
        onload: function(responseDetails) {
            var tempDivForXpath = document.createElement('div');
            tempDivForXpath.innerHTML = responseDetails.responseText; // contains the full html of a page
            var output = scrapeFirst(".//td[@class = \'timedist ul\']/div[1]/div", tempDivForXpath);
	    if (output == null) {
                errorCallback(this.url);
	    }
            //GM_log(output);
            var time = output.textContent.replace(/.*about/,'');
            successCallback(time, this.url);
        },
    });
}

function getCarEstimate(theEvent) {
    var theInputBox = theEvent.target;

    var br = scrapeFirst('../br',theInputBox);
    var link = scrapeFirst('../a',theInputBox);
    if (link == null) {
        link = document.createElement('a');
	link.target = '_blank';
        theInputBox.parentNode.insertBefore(link,br);
    }
    var inputAddress = '';//theInputBox.value;
	if(theInputBox.name == "suburb") {
	  inputAddress = theInputBox.previousSibling.previousSibling.value + ' ' + theInputBox.value;
	} else {
	  inputAddress = theInputBox.value + ' ' + theInputBox.nextSibling.nextSibling.value;
	}
	
    // check if there is an address to estimate
    if (inputAddress.length == 0) {
	    link.innerHTML = '';
	    return;
    }
    // check if we care about getting an estimate
    if (scrapeFirst("../input[@name = 'estimate']",theInputBox) == null) {
        return;
    }
    link.href = null;
    link.innerHTML = 'googling...';

    var boldAddress = scrapeFirst('../b',theInputBox).innerHTML;
    isFrom = theInputBox.name == 'from';
    var from = isFrom ? boldAddress : inputAddress;
    var to = isFrom ? inputAddress : boldAddress;
    var successAction = function (time, url) {
	link.innerHTML = 'google says ' + time;
	link.href = url;
    }
    var errorAction = function (url) {
        link.innerHTML = "google didn't like the address";
	link.href = url;
    } 
    queryGoogleMap(from, to, successAction, errorAction);
}

function buildDate(flightPoint) {
    return Date.parse(flightPoint.date + ' ' + prettyTime(flightPoint.time));
}

var carIdCounter = 1;
function Estimate(flightPoint) {
    this.id = 'c' + carIdCounter++;
    this.flightDate = buildDate(flightPoint);
    if (flightPoint.name == "Depart" || flightPoint.name == "Arrive") {
        this.flightPoint = flightPoint;
        this.flightPointAddress = flightPoint.dest.address;
        this.otherAddress = '';
	flightPoint.carId = this.id;
    }
    this.display = function (parentNode) {
        var div = document.createElement('div');
	div.id = this.id;
        div.name = 'car';
        var time = '50';
	var otherHtml = '';
	var directions = ['to','from'];
	if (flightPoint.name == 'Arrive') {
	    directions = ['from','to'];
	}
	else {
            otherHtml += ' will take <input name="estimate" size="2" value="' + time + '"/> minutes.&nbsp;';
	}
	var suburbHtml = ' , <input name="suburb" type="text" size="15" value="" />';
	var flightDateHtml = '<input type="hidden" id="' + this.id + 'date" value="' + this.flightDate + '"/>'; 
        var flightHtml = '<b name="' + directions[0] + '">' + this.flightPointAddress.replace('+',' ') + '</b>';
        otherHtml = '<input name="' + directions[1] + '" size="30" value=""/>' + suburbHtml + otherHtml;
        div.innerHTML = flightDateHtml + directions[0] + ' ' + flightHtml + ' ' + directions[1] + ' ' + otherHtml + '<br/>';
        // (<a href="#">google estimated 50 minutes</a>)
        parentNode.appendChild(div);

        //queryGoogleMap(this.fromAddress, this.toAddress, function (time) {
        //            });
    }
}
cityToCarLink = new Object();

function handleCarsFromGoogleSpreadsheet(result) {
    cityToCarLink = new Object();
    var cells = result.feed.entry;
    for (var i = 4; i < cells.length; i = i + 4) {
        row = [cells[i].content.$t,cells[i+1].content.$t,cells[i+2].content.$t,cells[i+3].content.$t];
        if (cityToCarLink[row[0]] == null) {
              cityToCarLink[row[0]] = new Object();
	}
        cityToCarLink[row[0]].href = 'skype:' + row[3] + '?call';
       	cityToCarLink[row[0]].innerHTML = 'call ' + row[1] + ' - ' + row[2] + ' - ' + row[3].replace(/\+61([2-9]..)(...)(...)/,'0$1\ $2\ $3').replace(/\+61(1...)(...)(...)/,'$1\ $2\ $3');
    } 
    var carLink = scrape("//div[@id = 'cars']/span/p/a", document);
    carLink.forEach(function(carLink) {
	if (carLink == null) {
	    carLink.href = '#';
	    carLink.innerHTML = 'could not find the city ' + carLink.name + ' in the google spreadsheet :( click the change cars link above to fix this';
	}
	else {
            carLink.href = cityToCarLink[carLink.name].href;
            carLink.innerHTML = cityToCarLink[carLink.name].innerHTML;
	}
    });

    refreshEmail();
}

function queryCarsOnGoogleSpreadsheets() {
    queryGoogleSpreadsheet('pgZYLtdPRv51beYTHUIrFWg', 'od6', 'handleCarsFromGoogleSpreadsheet');
}

function Cars(flights) {
    this.estimates = new Array();
    flights.reduce( function (estimates, flight) {
        flight.flightPoints.forEach(function (flightPoint) {
            estimates.push(new Estimate(flightPoint));
        });
        return estimates;
    }, this.estimates);
    this.display = function (element) {
        var div = document.createElement('div');
        div.id = 'cars';
        div.innerHTML += '<h2>Cars <span style="font-size:10pt"><a target="_blank" href="http://spreadsheets.google.com/ccc?key=pgZYLtdPRv51beYTHUIrFWg&hl=en">change cars</a> - <a href="#" id="carsRefresh">refresh cars</a></span></h2>';
	cities = new Object();
        this.estimates.forEach(function (estimate) {
            estimate.display(div);
	    GM_log('estimate' + estimate.flightPoint.dest.city);
	    GM_log('link' + cityToCarLink[estimate.flightPoint.dest.city]);
	    cities[estimate.flightPoint.dest.city] = cityToCarLink[estimate.flightPoint.dest.city];
	    GM_log('cities' + cities.length);
        });
        div.innerHTML += 'all cars before flights should arrive <input name="buffer" size="2" value="45"/> minutes early to airports<br/>';
	// add city placeholders for the data we'll get from google spreadsheets
	var carLinks = '<span id="carlinks">';
        for (var city in cities) {
	    carLinks += '<p style="margin:4px;"><a name="' + city + '"/></p>';	
	}
	carLinks += '</span>';
        div.innerHTML += carLinks;
	element.appendChild(div); 
 	var refreshCarsLink = document.getElementById('carsRefresh');
        refreshCarsLink.addEventListener("click", queryCarsOnGoogleSpreadsheets, false);
    }
};

var accommodationBookingIdCounter = 1;
function AccommodationBooking(flight, nextFlight) {
    this.id = 'a' + accommodationBookingIdCounter++ ;
    flight.accommodationBookingId = this.id;
    this.checkIn = flight.endPoint().date;
    this.checkOut = nextFlight != null ? nextFlight.startPoint().date : '';
    this.city = flight.endPoint().dest.city;
};

function Accommodation(flights) {
    this.bookings = flights.map(function (flight, index) {
        if (index < flights.length - 1 || flights.length == 1) {
            var nextFlight = flights[index + 1];
            return new AccommodationBooking(flight, nextFlight);
        }
    }).filter(function (booking) {return booking != null;});
    this.display = function(parentElement) {
       var div = document.createElement('div');
       div.id = 'accommodation';
       div.innerHTML += '<h2>Accommodation <span style="font-size:10pt"><a target="_blank" href="http://spreadsheets.google.com/ccc?key=pgZYLtdPRv50AK70fqJkQSw&hl=en">change hotels</a> - <a href="#" id="accommodationHotelRefresh">refresh hotels</a></span></h2>'; 
       div.innerHTML += '';
       this.bookings.forEach(function (booking) {
           var bookingDiv = document.createElement('div');
	   bookingDiv.id = booking.id;
	   bookingDiv.name = booking.city;
           bookingDiv.innerHTML += '<input type="hidden" name="city" value="' + booking.city + '"/>' + 'from: <input name="checkIn" value="' + booking.checkIn + '"/><br/>' + 
           'to: <input name="checkOut" value="' + booking.checkOut + '"/><br/>' +
	   'at: <select name="hotel">' +
           '</select> <a id="callHotel" href="skype:+61311111111?call">call +61311111111</a><br/>' + 
           'Room Type: <select name="roomType"><option>1 Bedroom</option><option>2 Bedroom</option><option>Studio</option>></select><br/>' +
           'Rate: $<input name="rate" value="0.00"/> per night - <select name="paid"><option value="false">not paid</option><option value="true">paid</option></select><br/>' + 
           'Reservation No:<input name="reservationNo" value=""/><br/>';
           div.appendChild(bookingDiv);
       });
       parentElement.appendChild(div);
       var refreshHotelsLink = document.getElementById('accommodationHotelRefresh');
       refreshHotelsLink.addEventListener("click", queryHotelsOnGoogleSpreadsheets, false);

    };
}

function Itinerary (flights) {
    this.flights = flights;
    this.extraHtml = '';
};

function ItineraryFactory (builders) {
    this.builders = builders;
    this.produce = function () {
	try {
	        var compatibleBuilders = this.builders.filter(function (builder) { return builder.isBuildable();});
        	var builder = compatibleBuilders[0];
	        if (compatibleBuilders.length == 0) {
	            GM_log("i don't understand this page.");
	            return;
	        }
		var rawFlights = scrape(builder.flightQuery, document);
		if (rawFlights.length == 0) {
			GM_log("i didn't find any flights on this page with the query: " + builder.flightQuery);
		}
	        var flights = scrape(builder.flightQuery, document).map(
	            function (element) {
	                flight = builder.flightParser(element);
	                flightPointElements = scrape(builder.flightPointQuery, element);
	                flight.flightPoints = flightPointElements.map(builder.flightPointParser);
       	         return flight;
	            });
	        // GM_log(builder.flightPointQuery + ' ' + scrape(builder.flightPointQuery, document).length);
	        var itinerary = new Itinerary(flights);
       		 itinerary.bookingRef = builder.parseBookingRef();
	        itinerary.name = builder.parseName();
	        itinerary.phone = builder.parsePhone();
	        if (builder.parseExtra != null ) {
	            itinerary.extraHtml = builder.parseExtra();
	        }
	        return itinerary;
	}
	catch (ex) {
             GM_log(ex);
	     throw ex;
	}
    };
};
function getChildInputElements(baseId) {
    var base = document.getElementById(baseId);
    var list = new Array();
    addElementsWithTag(list, base, 'input');
    addElementsWithTag(list, base, 'select');
   return list;
};

function addElementsWithTag(list, base, tag) {
    var inputs = base.getElementsByTagName(tag);
    for (var i=0; i<inputs.length; i++) {
        list.push(inputs.item(i));
    }
};

var itineraryFactory = new ItineraryFactory([new QantasConfirmationBuilder(), new QantasManageBuilder(), new VirginItineraryBuilder()]);
var itinerary = itineraryFactory.produce();
if (itinerary != null) {
// ok we have the flights from the page.
// next we have to help estimate the cars
// we need to get the pick up points and for each flight
// then we need to calculate the time using google
    var div = document.getElementById('travelplanner');
    if (div == null) {
        div = document.createElement('div');
        div.id = 'travelplanner';
    }
    else {
        div.innerHTML = '';
    }
    div.style.margin = '10px';
    div.style.padding = '20px';
    div.style.paddingTop = '0px';
    div.style.background = 'white';
    div.style.border = '5px dotted grey';
    div.innerHTML += '<style>' + 
                     '#travelplanner h1 {font-family: verdana;font-size: 18px; margin: 0px; color: #E6E6FA; letter-spacing: 0.3em;}' + 
                     '#travelplanner h2 {font-family: verdana; font-size: 20px; border-bottom: 2px solid #EEE8AA} ' + 
                     '#cars {background-color: #white} ' + 
                     '#cars h2 {background-color: white}' + 
		     '#logo-vb {visibility: hidden}' + // hide Virgin logo
		     '</style>';
    div.innerHTML += '<div style="position: absolute"><h1>travel planner</h1></div><div style="text-align: right"><a onclick="window.open(\'mailto:yeungda@gmail.com?subject=travelplanner error @ \' + window.location + \'&body=\' + encodeURIComponent(document.documentElement.innerHTML));alert(\'please send the funny looking email that popped up on the screen\');" href="#">send bug report</a></div>';
    document.body.insertBefore(div, document.body.firstChild); 
    new Contact().about(itinerary).display(div);
    new Accommodation(itinerary.flights).display(div);    
    new Cars(itinerary.flights).display(div);    
    new Email().about(itinerary).display(div);
    var ss = new Spreadsheet();
	ss.about(itinerary);
	ss.display(div);
	ss.displayFlight(div);
	
    refreshEmail();
    // refresh the email when the accommodation and cars are updated. 
    var contactInputs = getChildInputElements('contact');
    contactInputs.forEach(function (input) {
        input.addEventListener("change", refreshEmail, false);
    });
    var carInputs = getChildInputElements('cars');
    carInputs.forEach(function (input) {
        input.addEventListener("change", refreshEmail, false);
	if (input.name == 'from' || input.name == 'to' || input.name == 'suburb') {
            input.addEventListener("change", getCarEstimate, false);
	}
    });
    var accommodationInputs = getChildInputElements('accommodation');
    accommodationInputs.forEach(function (input) {
        input.addEventListener("change", refreshEmail, false);
    });
    queryHotelsOnGoogleSpreadsheets();
    queryCarsOnGoogleSpreadsheets();
}

// ==== Code for insertion into google spreadsheet ==== //

var spreadsheetRecordKey = 'pt3pm9pheGN4Ra5uwmiJxQA';
var flightSpreadsheetRecordKey = 'pt3pm9pheGN48LKQPGaFiSQ';

function insertIntoGoogleSpreadsheet(rowData, spreadsheetKey, callbackFunction) {
    GM_xmlhttpRequest({
        method: 'POST',
        url: 'http://spreadsheets.google.com/feeds/list/' + spreadsheetKey + '/1/private/full',
        headers: {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
			'Content-Type': 'application/atom+xml',
        },
		data: '<atom:entry xmlns:atom="http://www.w3.org/2005/Atom">' + rowData + '</atom:entry>',
        onload: function (responseDetails) {
		  if(responseDetails.status != 201) {
			callbackFunction(responseDetails.status);
			}
        },
		onerror: function(responseDetails) {
		  alert("Google Spreadsheet: " + responseDetails.responseText);
		},
    });
}

// Takes a google spreadsheet query results and discovers if there are
// no results
function isNoResults(queryResultText) {
  return (queryResultText.match("<entry>") == null);
}

//IN: "Day Month(word) Year"
//OUT: "mm/dd/yyyy"
function convertToGSDate(dateString) {
  var tokens = dateString.split(' ');
  day = tokens[0];
  monthString = tokens[1];
  year = tokens[2];
  
    this.January = 1;
	this.February = 2;
	this.March = 3;
	this.April = 4;
	this.May = 5;
	this.June = 6;
	this.Juyl = 7;
	this.August = 8;
	this.September = 9;
	this.October = 10;
	this.November = 11;
	this.December = 12;
  
  return this[monthString] + '/' + day + '/' + year;
}

//Queries for row that matches rowData (6 elements) so we can check if it exists
//If it doesn't exist it inserts it
function insertRowIntoSpreadSheetIfNotExists(rawRowData, callbackFunction) {

var urlQuery = 'http://spreadsheets.google.com/feeds/list/' + spreadsheetRecordKey + '/1/private/full?sq=';
urlQuery += 'name%3D';
urlQuery += '"' + rawRowData[0].innerHTML + '"';
urlQuery += '%20and%20to%3D';
urlQuery += '"' + rawRowData[1].innerHTML + '"';
urlQuery += '%20and%20from%3D';
urlQuery += '"' + rawRowData[2].innerHTML + '"';
var dateString = convertToGSDate(rawRowData[3].innerHTML);
urlQuery += '%20and%20date%3D';
urlQuery += '"' + dateString  + '"';
urlQuery += '%20and%20depart%3D';
var departString = '"' + rawRowData[4].innerHTML + ':00' + '"';
if(departString.charAt(1) == '0')
  departString = '"' + departString.substring(2);
urlQuery += departString;

    GM_xmlhttpRequest({
        method: 'GET',
		url: urlQuery,
        headers: {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
        },
        onload: function (responseDetails) {
			if(responseDetails.status != 200) {
				callbackFunction(responseDetails.status);
				}
			if(isNoResults(responseDetails.responseText))
				insertIntoGoogleSpreadsheet(createRowInsertStringForTravel(rawRowData), spreadsheetRecordKey, callbackFunction);
		},
		onerror:function(responseDetails) {
			alert("ERROR ON TABLE INSERTION");
		}
    });
}

//Takes cells from a table row and formats them using the column names
//in the google spreadsheet so they can be inserted as a row
function createRowInsertStringForTravel(cells) {
	var insertString = '';
	insertString += '<gsx:name xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[0].innerHTML;
	insertString += '</gsx:name>';
	insertString += '<gsx:to xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[1].innerHTML;
	insertString += '</gsx:to>';
	insertString += '<gsx:from xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[2].innerHTML;
	insertString += '</gsx:from>';
	insertString += '<gsx:date xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[3].innerHTML;
	insertString += '</gsx:date>';
	insertString += '<gsx:depart xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[4].innerHTML;
	insertString += '</gsx:depart>';
	insertString += '<gsx:projectcode xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[5].innerHTML;
	insertString += '</gsx:projectcode>';
	return insertString;
}

function insertTravelTableIntoGS() {
  var progressElement = document.createElement('p');
  progressElement.innerHTML = 'Parsing table... to spreadsheet: <a href="http://spreadsheets.google.com/ccc?key=' + spreadsheetRecordKey + '&hl=en#"> Travel Spreadsheet</a>'; 
  document.getElementById('spreadsheet').appendChild(progressElement);
  
  var errorElement = document.createElement('p');
  errorElement.innerHTML = '';
  document.getElementById('spreadsheet').appendChild(errorElement);

  var table = document.getElementById('spreadsheetTable');
  for(row in table.rows) {
    if(row == "length" || table.rows[row].cells[0].innerHTML == "Name") continue;
    var cells = table.rows[row].cells;
	
	progressElement.innerHTML = 'Parsing row ' + row; 
	insertRowIntoSpreadSheetIfNotExists(cells, 
		function(status){ errorElement.innerHTML = status + ' Error while interacting with travel spreadsheet. Before you freakout make sure you are logged into a google account that has access to the <a href="http://spreadsheets.google.com/ccc?key=' + spreadsheetRecordKey + '&hl=en#"> Travel Spreadsheet</a>';
			errorElement.style.color = 'red';
			progressElement.style.visibility = 'hidden';
			}
		);
  }
  
  progressElement.innerHTML = 'Completed parsing table to spreadsheet: <a href="http://spreadsheets.google.com/ccc?key=' + spreadsheetRecordKey + '&hl=en#">Travel Spreadsheet</a>';

  insertFlightTableIntoGS();
}

//Queries for row that matches rowData (6 elements) so we can check if it exists
//If it doesn't exist it inserts it
function insertRowIntoFlightSpreadSheetIfNotExists(rawRowData, callbackFunction) {

var urlQuery = 'http://spreadsheets.google.com/feeds/list/' + flightSpreadsheetRecordKey + '/1/private/full?sq=';
urlQuery += 'traveldate%3D';
var dateString = convertToGSDate(rawRowData[0].innerHTML);
urlQuery += '"' + dateString + '"';
urlQuery += '%20and%20name%3D';
urlQuery += '"' + rawRowData[1].innerHTML + '"';
urlQuery += '%20and%20from%3D';
urlQuery += '"' + rawRowData[2].innerHTML + '"';
urlQuery += '%20and%20to%3D';
urlQuery += '"' + rawRowData[3].innerHTML  + '"';  
/*urlQuery += '%20and%20booked%3D';
dateString = convertToGSDate(convertdayddMmmyyToddMyyyy(rawRowData[4].innerHTML));
urlQuery += '"' + dateString + '"'; */ // Don't compare booked date as it is not a reliable indicator given that QANTAS bookings don't display this information so we assume current date
var price = rawRowData[5].innerHTML;
if(-1 != price.indexOf('.')) {
  price = price.substring(0, price.indexOf('.'));
}
urlQuery += '%20and%20price%3D';
urlQuery += '"' + price  + '"';

    GM_xmlhttpRequest({
        method: 'GET',
		url: urlQuery,
        headers: {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
        },
        onload: function (responseDetails) {
			if(responseDetails.status != 200) {
				callbackFunction(responseDetails.status);
				}
			if(isNoResults(responseDetails.responseText))
				insertIntoGoogleSpreadsheet(createRowInsertStringForFlight(rawRowData), flightSpreadsheetRecordKey, callbackFunction);
		},
		onerror:function(responseDetails) {
			alert("ERROR ON TABLE INSERTION");
		}
    });
}

//Takes cells from a table row and formats them using the column names
//in the google spreadsheet so they can be inserted as a row
function createRowInsertStringForFlight(cells) {
	var insertString = '';
	insertString += '<gsx:traveldate xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[0].innerHTML;
	insertString += '</gsx:traveldate>';
	insertString += '<gsx:name xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[1].innerHTML;
	insertString += '</gsx:name>';
	insertString += '<gsx:from xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[2].innerHTML;
	insertString += '</gsx:from>';
	insertString += '<gsx:to xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[3].innerHTML;
	insertString += '</gsx:to>';
	insertString += '<gsx:booked xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
    insertString += convertdayddMmmyyToddMyyyy(cells[4].innerHTML);
	insertString += '</gsx:booked>';
	insertString += '<gsx:price xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[5].innerHTML.substring(0, cells[5].innerHTML.indexOf('.'));
	insertString += '</gsx:price>';
	insertString += '<gsx:projectcode xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[6].innerHTML;
	insertString += '</gsx:projectcode>';
	insertString += '<gsx:daysaway xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">';
	insertString += cells[7].innerHTML;
	insertString += '</gsx:daysaway>';
	return insertString;
}

function insertFlightTableIntoGS() {
  var progressElement = document.createElement('p');
  progressElement.innerHTML = 'Parsing table... to spreadsheet: <a href="http://spreadsheets.google.com/ccc?key=' + flightSpreadsheetRecordKey + '&hl=en#"> Flight Spreadsheet</a>'; 
  document.getElementById('spreadsheet').appendChild(progressElement);
  
  var errorElement = document.createElement('p');
  errorElement.innerHTML = '';
  document.getElementById('spreadsheet').appendChild(errorElement);

  var table = document.getElementById('spreadsheetFlightTable');
  for(row in table.rows) {
    if(row == "length" || table.rows[row].cells[0].innerHTML == "Date") continue;
    var cells = table.rows[row].cells;
	
	progressElement.innerHTML = 'Parsing row ' + row; 
	insertRowIntoFlightSpreadSheetIfNotExists(cells, 
		function(status){ errorElement.innerHTML = status + ' Error while interacting with travel spreadsheet. Before you freakout make sure you are logged into a google account that has access to the <a href="http://spreadsheets.google.com/ccc?key=' + flightSpreadsheetRecordKey + '&hl=en#"> Flight Spreadsheet</a>';
			errorElement.style.color = 'red';
			progressElement.style.visibility = 'hidden';
			}
		);
  }
  
  progressElement.innerHTML = 'Completed parsing table to spreadsheet: <a href="http://spreadsheets.google.com/ccc?key=' + flightSpreadsheetRecordKey + '&hl=en#">Flight Spreadsheet</a>'; 
}

var newButton = document.createElement('input');  
newButton.setAttribute("type", "submit");  
newButton.setAttribute("value", "Store In Spreadsheets");  
newButton.addEventListener("click", insertTravelTableIntoGS, false); 
document.getElementById('spreadsheet').appendChild(newButton);

//
// Following below is test cases for this travel helper. They are based upon
// the test sample data from qantas and virgin pages.
//
var runTests = false;
var tests = new Array();

// Test result will either be pass/fail boolean or a ignored reason
function testResult(name) {
  this.pass = false;
  this.ignoredReason = "";
  this.testName = name;
  this.result = function() {
    return (this.ignoredReason == "") ? this.pass : this.ignoredReason;
  };
}

function showTestResults(testResultArray) {
  var passes = 0;
  var fails = 0;
  var ignored = 0;
  var failedTestNames = "";
  for(x in testResultArray) {
    result = testResultArray[x].result();
	if(result == true)
	  passes++;
	else if(result == false) {
  	  failedTestNames += "\n" + testResultArray[x].testName; 
	  fails++;
	}
	else
	  ignored++;
  }
  
  if(fails > 0)
	alert("Passes: " + passes + "\nFails: " + fails + "\nIgnored: " + ignored + " Failed Tests" +  failedTestNames);
  else {
  alert("Passes: " + passes + "\nFails: " + fails + "\nIgnored: " + ignored);
  }
}

function isVirginBluePage() {
  try {
    if(scrapeFirst("//div[@class = 'box-title']/h2/span", document).innerHTML.substring("Virgin Blue").length > 0)
	  return true;
  } catch(err) {}
  return false;
}

function isQantasPage() {
  try {
    if(scrapeText("id('copyright')", document).search('Qantas') >= 0)
	  return true;
  } catch(err) {}
  return false;
}

function testFlightData() {
  this.referenceNumber = '?';
  this.flightPrices = new Array();

  if(isVirginBluePage()) {
	this.referenceNumber = "VIUNCD";
	this.flightPrices.push("180.00");
	this.flightPrices.push("105.00");
	
  }
  else if(isQantasPage()) { 
	this.referenceNumber = "YM9U2N";
	this.flightPrices.push("322.85");
	this.flightPrices.push("322.85");
  } 
}

var testData = new testFlightData();

function testBookingReference(testData) {
  var result = new testResult("testBookingReference");
  
  if(scrapeFirst("//div[@id = 'email']", document).innerHTML.substring(testData.referenceNumber).length > 0) {
	result.pass = true;
    return result;
	}
  else
  {
    result.pass = false;
    return result;
	}
}

function testFlightPrices(testData) {
  var result = new testResult("testFlightPrices");

    for(i=0 ; i < testData.flightPrices.length ; i++) {
	  var cells = document.getElementById("spreadsheetFlightTable").rows[i+1].cells;
	  if(cells[5].innerHTML != testData.flightPrices[i]) {
	    result.pass = false;
	    return result;
	  }
	}
	result.pass = true;
	return result;
}

function testGetDateObjectFromFlightDate() {
  var result = new testResult("testGetDateObjectFromFlightDate");
  
  var inputDate = "25 September 2008";
  var expectedDate = new Date();
  expectedDate.setFullYear(2008,8,25);
  expectedDate.setHours(0);
  expectedDate.setMinutes(0);
  expectedDate.setSeconds(0);
  expectedDate.setMilliseconds(0);
  
  var resultDate = getDateObjectFromFlightDate(inputDate);
  result.pass = (expectedDate.getTime() == resultDate.getTime()) ? true : false;

  alert(resultDate.toString() + "\n" + expectedDate.toString());

  return result;
	
}

if(runTests == true) {
  tests.push(testBookingReference(testData));
  tests.push(testFlightPrices(testData));
  tests.push(testGetDateObjectFromFlightDate());
  showTestResults(tests);
}
