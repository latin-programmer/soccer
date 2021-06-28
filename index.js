const cheerio = require('cheerio');
const got = require('got');
const nodemailer = require('nodemailer');
const tableSelector = '#ctl00_C_Schedule1_GridView1'
const url = 'https://shreveportindoorsoccer.ezleagues.ezfacility.com/leagues/394636/Mens-3.aspx';
const team_name = "Broadmoor Blues (Blue)"
const months =
[
    {month: 'Jan', monthNum: '1'},
    {month: 'Feb', monthNum: '2'},
    {month: 'Mar', monthNum: '3'},
    {month: 'Apr', monthNum: '4'},
    {month: 'May', monthNum: '5'},
    {month: 'Jun', monthNum: '6'},
    {month: 'Jul', monthNum: '7'},
    {month: 'Aug', monthNum: '8'},
    {month: 'Sep', monthNum: '9'},
    {month: 'Oct', monthNum: '10'},
    {month: 'Nov', monthNum: '11'},
    {month: 'Dec', monthNum: '12'}
]
const email_list = 'srdjanristic@yahoo.com'

got(url).then(response => {
    const $ = cheerio.load(response.body);
    const options = {
        rowForHeadings: 0,  // extract th cells from this row for column headings (zero-based)
        ignoreHeadingRow: true, // Don't tread the heading row as data
        ignoreRows: [],
    }
    const jsonReponse = []
    const columnHeadings = []
    const my_team = []
    const unplayed_games = []

    $(tableSelector).each(function(i, table) {
        var trs = $(table).find('tr')

        // Set up the column heading names
        getColHeadings( $(trs[options.rowForHeadings]) )

        // Process rows for data
        $(table).find('tr').each(processRow)

        processMyTeam();
    })

    function getColHeadings(headingRow) {
        const alreadySeen = {}

        $(headingRow).find('th').each(function(j, cell) {
            let tr = $(cell).text().trim()

            if ( alreadySeen[tr] ) {
                let suffix = ++alreadySeen[tr]
                tr = `${tr}_${suffix}`
            } else {
                alreadySeen[tr] = 1
            }

            if (tr === '') {
                tr = 'Score'
            }

            if (tr === 'Time/Status') {
                tr = 'TimeStatus'
            }

            columnHeadings.push(tr)
        })
    }

    function processRow(i, row) {
        const rowJson = {}

        if ( options.ignoreHeadingRow && i === options.rowForHeadings ) return
        // TODO: Process options.ignoreRows

        $(row).find('td').each(function(j, cell) {
            rowJson[ columnHeadings[j] ] = $(cell).text().trim()
        })

        // Skip blank rows
        if (JSON.stringify(rowJson) !== '{}') jsonReponse.push(rowJson)
    }

    function sendEmail(body) {
        var transporter = nodemailer.createTransport({
            host: 'smtp.mail.yahoo.com',
            port: 465,
            service: 'Yahoo',
            secure: false,
            auth: {
              user: 'spam@rocketmail.com', // my spam email
              pass: '' // add password
            }
            // logger: 'true'
          });
          
          var mailOptions = {
            from: 'spam@rocketmail.com', // my spam email
            to: email_list, // recipients
            subject: 'Shreveport Indoor Soccer Schedule',
            text: body
          };
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
    }

    function processMyTeam() {
        $(jsonReponse).each(function(i, element) {
            var home = element.Home;
            var away = element.Away;
            if (home === team_name || away === team_name) 
            {
                my_team.push(element)
            }
        })
    
        $(my_team).each(function(i, element) {
            if (element.Score === 'v' && element.TimeStatus !== 'Complete' && element.Officials === '' ) {
                unplayed_games.push(element);
            }
        })

        var emailbody = ''
        $(unplayed_games).each(function(i, element) {
            var today_date = getDate()
            var tomorrow = getDate(1)
            var parsedDate = parseDate(element.Date)
            if (parsedDate === today_date) {
                emailbody += 'GAME TODAY!!!' + '\n'
                emailbody += 'Game Date: ' + element.Date + '\n'
                emailbody += 'Teams: ' + element.Home + ' vs ' + element.Away + '\n'
                emailbody += 'Time: ' + element.TimeStatus + '\n'
                emailbody += '------------------------------' + '\n'
            } else if (parsedDate === tomorrow) {
                emailbody += 'GAME TOMORROW!' + '\n'
                emailbody += 'Game Date: ' + element.Date + '\n'
                emailbody += 'Teams: ' + element.Home + ' vs ' + element.Away + '\n'
                emailbody += 'Time: ' + element.TimeStatus + '\n'
                emailbody += '------------------------------' + '\n'
            }
        })

        if (emailbody !== '') {
            // console.log(emailbody)
            sendEmail(emailbody)
        }
    }

    function getDate(addDays) {
        var datetime = new Date();
        if (addDays !== '' && addDays !== undefined) {
            datetime.setDate(datetime.getDate() + addDays)
        }
        var month = datetime.getMonth() + 1; //months from 1-12
        var day = datetime.getDate();
        var year = datetime.getFullYear();
        return year + "/" + month + "/" + day;
    }

    function parseDate(date) {
        var datetime = new Date();
        var year = datetime.getUTCFullYear();
        var justMonth = date.substring(
            date.lastIndexOf("-") + 1,
            date.lastIndexOf(" ")
        );
        var justDay = date.substring(
            date.lastIndexOf(" ") + 1,
            date.length
        );

        var result = year + '/';
        $(months).each(function(i, element) {
            if (element.month === justMonth) {
                result += element.monthNum + '/';
            }
        })
        result += justDay
        return result;
    }
    
}).catch(err => {
    console.log(err);
});
