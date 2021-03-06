const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const IssueModel = require('../models/issue');
const UserIssueModel = require('../models/userissue');
const DemographicModel = require('../models/demographic');
const IssueDataModel = require('../models/issueData');
const UserModel = require('../models/user');

router.get('/userissues/stats/:issueid/:userid', getStatsForOneIssue);
router.get('/userissues/:issueid/:userid', getUserIssue);
router.post('/userissues/', createUserIssue);


// http status codes
const statusOK = 200;
const statusNotFound = 404;
const statusError = 500;
const genderKeys = ['Male', 'Female', 'Other'];
const genderValues = ['male', 'female', 'other'];
const partyKeys = ['Democrat', 'Republican', 'Libertarian', 'Green', 'Constitution', 'Unaligned'];
const partyValues = ['democrat', 'republican', 'libertarian', 'green', 'constitution', 'unaligned'];
const educationKeys = ['None', 'Diploma', 'Associates', 'Bachelors', 'Masters', 'Doctoral'];
const educationValues = ['none', 'diploma', 'associate\'s', 'bachelor\'s', 'master\'s', 'doctoral'];
const ethnicityKeys = ['White', 'AfricanAmerican', 'Asian', 'NativeAmerican', 'Hispanic', 'Other'];
const ethnicityValues = ['white', 'african american', 'asian', 'native american', 'hispanic', 'other'];

//Gets stats for number of yes/no votes on an issue id
async function getStatsForOneIssue(request, response, next) {
    try {
        let userIssues = await UserIssueModel.find({issueId: String(request.params.issueid).toLowerCase()}).exec();
        let userIssue = await UserIssueModel.find({userId: String(request.params.userid).toLowerCase(), issueId: String(request.params.issueid).toLowerCase()}).exec();
        let voteYes = 0;
        let voteNo = 0;
        for(let i = 0; i<userIssues.length; i++)
        {
            if(userIssues[i].vote === "yes")
                voteYes++;
            else
                voteNo++;
        }
        let data = {data: [{x:'no', y:voteNo}, {x:'yes', y:voteYes}], uservote: userIssue[0].vote};
        response.statusCode = statusOK;
        response.send(data);
    } catch (error) {
        next(error);
    }
}

async function getUserIssue(request, response, next) {
    try {
        let userIssue = await UserIssueModel.find({userId: String(request.params.userid).toLowerCase(), issueId: String(request.params.issueid).toLowerCase()}).exec();
        response.statusCode = statusOK;
        (userIssue.length>0) ? response.send(userIssue[0]): response.send({});
    } catch (error) {
        next(error);
    }
}

async function createUserIssue(request, response, next) {
    // get data from request
    let newObject = request.body;
    try{
        //check if issue exists
        let userIssueFounded = await UserIssueModel.find({issueId: request.body.issueId, userId: String(request.body.userId).toLowerCase()}).exec();
        if(userIssueFounded.length === 0)
        {
            newObject.date = new Date();
            // add data to MongoDB database
            const userIssue = new UserIssueModel(newObject);
            userIssue.save(async (error, dbRes) => {
                if (error) return console.error(error);
                //find and update the existing issueData accordingly
                let issueDataRes = await IssueDataModel.find({issueId: dbRes.issueId}).exec();
                let issueData = issueDataRes[0];
                let user = await UserModel.findById(dbRes.userId).exec();
                let demographic = await DemographicModel.findById(user.demographicId).exec();
                let gender = String(demographic.gender).toLowerCase();
                let party = String(demographic.partyAffiliation).toLowerCase();
                let education = String(demographic.education).toLowerCase();
                let ethnicity = String(demographic.ethnicity).toLowerCase();
                if(String(dbRes.vote).toLowerCase()==='yes')
                {
                    for(let i = 0; i<genderKeys.length; i++) {
                        if(gender===genderValues[i]) {
                            issueData.yes.gender[genderKeys[i]]+=1
                            break;}
                    }
                    for(let i = 0; i<partyKeys.length; i++) {
                        if(party===partyValues[i]) {
                            issueData.yes.party[partyKeys[i]]+=1
                            break;}
                    }
                    for(let i = 0; i<educationKeys.length; i++) {
                        if(education===educationValues[i]) {
                            issueData.yes.education[educationKeys[i]]+=1
                            break;}
                    }
                    for(let i = 0; i<ethnicityKeys.length; i++) {
                        if(ethnicity===ethnicityValues[i]) {
                            issueData.yes.ethnicity[ethnicityKeys[i]]+=1
                            break;}
                    }
                } else {
                    for(let i = 0; i<genderKeys.length; i++) {
                        if(gender===genderValues[i]) {
                            issueData.no.gender[genderKeys[i]]+=1
                            break;}
                    }
                    for(let i = 0; i<partyKeys.length; i++) {
                        if(party===partyValues[i]) {
                            issueData.no.party[partyKeys[i]]+=1
                            break;}
                    }
                    for(let i = 0; i<educationKeys.length; i++) {
                        if(education===educationValues[i]) {
                            issueData.no.education[educationKeys[i]]+=1
                            break;}
                    }
                    for(let i = 0; i<ethnicityKeys.length; i++) {
                        if(ethnicity===ethnicityValues[i]) {
                            issueData.no.ethnicity[ethnicityKeys[i]]+=1
                            break;}
                    }
                }
                await IssueDataModel.findOneAndUpdate({issueId: dbRes.issueId}, {yes: issueData.yes, no:issueData.no}).exec();
                let issue = await IssueModel.findById(dbRes.issueId).exec();
                let userIssue = await UserIssueModel.find({userId: dbRes.userId, issueId: dbRes.issueId}).exec();
                let votedInfo = {};
                if (userIssue.length > 0) {
                    votedInfo.voted = true;
                    votedInfo.vote = userIssue[0].vote;
                    let voteYes = 0;
                    let voteNo = 0;
                    let userIssues = await UserIssueModel.find({issueId: dbRes.issueId}).exec();
                    for(let i = 0; i<userIssues.length; i++)
                    {
                        if(userIssues[i].vote === "yes")
                            voteYes++;
                        else
                            voteNo++;
                    }
                    votedInfo.data = [{x:'no', y:voteNo}, {x:'yes', y:voteYes}];
                } else {
                    votedInfo.voted = false;
                    votedInfo.vote = false;
                    votedInfo.data = [];
                }
                response.statusCode = statusOK;
                response.send({issue, votedInfo});
            });
        }
        else //if user has voted before on the issue, do nothing
            response.send(null);
    }
    catch(error) {
        next(error);
    }
};

module.exports = router;

