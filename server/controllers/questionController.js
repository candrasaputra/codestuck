const Question = require('../models/question');
const Answer = require('../models/answer');

class QuestionController {
    static findAll(req, res, next) {
        let where = {}
        if (req.query.tags) {
            where = { "tags": { $regex: '' + req.query.tags + '', $options: 'i' } }
        }
        
        Question.find(where)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .then(questions => {
                res.status(200).json(questions);
            }).catch(next);
    }

    static findOne(req, res, next) {
        Question
            .findById(req.params.id)
            .populate({
                path: 'answers',
                model: 'Answer',
                options: {
                    sort: {
                        'createdAt': -1
                    }
                },
                populate: {
                    path: 'userId',
                    select: 'name email createdAt'
                }
            })
            .populate('userId', 'name email')
            .then(data => {
                if (!data) next({ httpStatus: 404, message: 'Question not found' })
                else res.json(data);
            })
            .catch(next);
    }

    static store(req, res, next) {
        const { title, content } = req.body;
        let tags = req.body.tags;
        if (tags) {
            tags = tags.split(',')
        }

        Question
            .create({
                title,
                content,
                tags,
                userId: req.decode.id,
            })
            .then(data => {
                return data.populate('userId', 'name email').execPopulate()
            })
            .then(data => {
                res.status(201).json(data);
            })
            .catch(next)
    }

    static update(req, res, next) {
        const { title, content } = req.body;
        let tags = req.body.tags;
        if (tags) {
            tags = tags.split(',')
        }
        Question
            .findByIdAndUpdate(req.params.id, {
                title,
                content,
                tags,
            }, { new: true, omitUndefined: true })
            .populate('userId', 'name email')
            .then(data => {
                if (!data) {
                    next({ statusCode: 404, msg: 'Question not found' })
                }
                else {
                    res.json(data);
                }
            })
            .catch(next);
    }
    
    static solution(req, res, next) {
        
        Question
            .findOneAndUpdate({
                _id: req.params.id,
                answers: req.body.answerId
            }, {
                solution: req.body.answerId
            }, { new: true, omitUndefined: true })
            .populate('userId', 'name email')
            .populate('solution')
            .populate('answers')
            .then(data => {
                if (!data) {
                    next({ statusCode: 404, msg: 'Question / answer not found' })
                }
                else {
                    res.json({message: 'select solution success', data});
                }
            })
            .catch(next);
    }

    static delete(req, res, next) {
        Question
            .findByIdAndDelete(req.params.id)
            .then(data => {                
                return Answer.deleteMany({ questionId: req.params.id })
            })
            .then(data => {
                res.json({ message: 'Successfully Delete Question' })
            })
            .catch(next);
    }

    static upVote(req, res, next) {
        Question
            .findByIdAndUpdate({ _id: req.params.id }, {
                $pull: { downvotes: req.decode.id }
            })
            .then(data => {
                console.log(data);
                return Question
                    .findOne({
                        _id: req.params.id,
                        upvotes: req.decode.id
                    })
            })
            .then(data => {
                console.log(data, req.decode.id);
                if (data) {
                    throw next({ statusCode: 400, msg: "You has upvote this question" })
                } else {
                    return Question
                        .findByIdAndUpdate({ _id: req.params.id }, {
                            $push: { upvotes: req.decode.id }
                        })
                }
            })
            .then(data => {
                if (!data) {
                    next({ statusCode: 404, msg: 'Question not found' })
                } else {
                    res.json({ message: 'Upvote success!' });
                }
            })
            .catch(next);
    }

    static downVote(req, res, next) {
        Question
            .findByIdAndUpdate(req.params.id, {
                $pull: { upvotes: req.decode.id }
            })
            .then(data => {
                return Question
                    .findOne({
                        _id: req.params.id,
                        downvotes: req.decode.id
                    })
            })
            .then(data => {
                if (data) {
                    throw next({ statusCode: 400, msg: "You has downvote this question" })
                } else {
                    return Question
                        .findByIdAndUpdate(req.params.id, {
                            $push: { downvotes: req.decode.id }
                        })
                }
            })
            .then(data => {
                if (!data) {
                    next({ statusCode: 404, msg: 'Question not found' });
                } else {
                    res.json({ update: data.length, message: 'Downvote Success!' });
                }
            })
            .catch(next);
    }

    static removeVote(req, res, next) {
        Question
            .findByIdAndUpdate(req.params.id, {
                $pull: { upvotes: req.decode.id }
            })
            .then(data => {
                return Question
                    .findByIdAndUpdate(req.params.id, {
                        $pull: { downvotes: req.decode.id }
                    })
            })
            .then(data => {
                if (!data) {
                    next({ statusCode: 404, msg: 'Question not found' })
                } else {
                    res.json({ update: data.length, message: 'Remove vote Success!' });
                }
            })
    }
}

module.exports = QuestionController
