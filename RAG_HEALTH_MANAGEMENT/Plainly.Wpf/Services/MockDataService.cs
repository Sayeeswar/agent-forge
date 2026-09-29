using Plainly.Wpf.Models;

namespace Plainly.Wpf.Services;

public sealed class MockDataService : IMockDataService
{
    public IReadOnlyDictionary<int, HealthDocumentSource> DocumentSources { get; } =
        new Dictionary<int, HealthDocumentSource>
        {
            [1] = new(1, "Understanding Diabetes: A Patient Guide",
                "PDF · Added 12 September · Page 4 of 18", "Page 4",
                "What your HbA1c result means",
                "The HbA1c test measures how much sugar has attached to your red blood cells. Because these cells live for about three months, the test gives a picture of your average blood sugar over that time, rather than on a single day.",
                "A result below 5.7% is in the usual range. A result between 5.7% and 6.4% is an in-between range sometimes called prediabetes. A result of 6.5% or above is usually linked with diabetes.",
                "A single result is not a diagnosis on its own. Your doctor will usually repeat the test or look at other results before making a decision."),
            [2] = new(2, "Living Well with Type 2 Diabetes",
                "PDF · Added 12 September · Page 12 of 40", "Page 12",
                "Bringing your numbers down",
                "Finding out that your blood sugar is high can feel worrying. It helps to know that this is very common and that small, steady changes make a real difference.",
                "Many people are able to lower their HbA1c through changes to what they eat and how active they are each day. Some people will also need medicine, which your doctor can talk through with you.",
                "Most people have their HbA1c checked again every three to six months to see how things are going."),
            [3] = new(3, "Thyroid Basics",
                "PDF · Added 12 September · Page 5 of 12", "Page 5",
                "Reading your TSH result",
                "TSH is a message your brain sends to your thyroid, telling it how hard to work.",
                "When the thyroid is slow, the brain sends more TSH to push it along. This is why a high TSH result often means the thyroid is underactive.",
                "Your doctor may check other thyroid results as well before deciding on any treatment."),
            [4] = new(4, "Cholesterol Explained",
                "PDF · Added 12 September · Page 3 of 10", "Page 3",
                "Good and bad cholesterol",
                "Cholesterol travels around the body in two main forms.",
                "HDL is often called good cholesterol because it helps carry extra cholesterol away from your blood vessels. Higher HDL levels are usually better for your heart.",
                "LDL, sometimes called bad cholesterol, can build up in blood vessels when levels are high."),
            [5] = new(5, "Caring for Your Heart",
                "PDF · Added 12 September · Page 9 of 22", "Page 9",
                "Everyday steps for blood pressure",
                "Small changes, kept up over time, can make a real difference to blood pressure.",
                "Eating less salt, being active most days, and cutting down on alcohol can all help lower blood pressure. Some people will also need medicine.",
                "Checking your blood pressure at home can help you and your doctor see how things are going."),
            [6] = new(6, "Vitamin D and You",
                "PDF · Added 12 September · Page 2 of 8", "Page 2",
                "What your vitamin D result means",
                "Vitamin D helps your body keep your bones and muscles strong.",
                "A level of 20 ng/mL or above is usually enough for most people. A level below 20 ng/mL is generally considered low.",
                "Your body makes vitamin D when your skin is in sunlight. It is also found in oily fish, eggs and some fortified foods."),
            [7] = new(7, "Understanding Anaemia",
                "PDF · Added 12 September · Page 6 of 14", "Page 6",
                "Low iron and tiredness",
                "Anaemia means your blood is carrying less oxygen than usual.",
                "The most common cause is low iron. People with low iron often feel tired, weak or short of breath, and may look paler than usual.",
                "A blood test can show your iron levels. Treatment is usually simple once the cause is known."),
        };

    public IReadOnlyList<ChatSessionSummary> ChatSessions { get; } = new List<ChatSessionSummary>
    {
        new(0, "Understanding my blood report", "My blood report", "Today", "Today, 10:24",
            IsMain: true, SourceDocId: null, Question: null, Paragraphs: null),
        new(1, "My thyroid results", "My thyroid results", "Yesterday", "Yesterday, 16:05",
            IsMain: false, SourceDocId: 3,
            Question: "My thyroid report says my TSH is high. What does that mean?",
            Paragraphs: new[]
            {
                "TSH is a signal your brain sends to your thyroid. A high TSH often means your thyroid is working more slowly than usual, so your brain is asking it to do more.",
                "A slow thyroid can sometimes make people feel tired, cold or low in energy, though many people notice no changes at all.",
                "This is common and is usually easy to check and treat. Your doctor will look at your other results before deciding what, if anything, is needed.",
            }),
        new(2, "What is good cholesterol?", "What is good cholesterol?", "14 August", "14 August, 09:40",
            IsMain: false, SourceDocId: 4,
            Question: "What is good cholesterol?",
            Paragraphs: new[]
            {
                "Good cholesterol, called HDL, helps carry extra cholesterol away from your blood vessels. Having more of it is usually better for your heart.",
                "Bad cholesterol, called LDL, can slowly build up inside blood vessels when levels are high. That is why your report may show both numbers.",
                "Being active, eating more vegetables and whole grains, and not smoking can all help your cholesterol levels over time.",
            }),
        new(3, "Lowering blood pressure", "Lowering blood pressure", "2 July", "2 July, 18:12",
            IsMain: false, SourceDocId: 5,
            Question: "What can I do to lower my blood pressure?",
            Paragraphs: new[]
            {
                "Your documents suggest a few simple steps: eating less salt, being active most days, and cutting down on alcohol.",
                "Even a brisk 30-minute walk on most days can help. Checking your blood pressure at home can show you how things are going.",
                "Some people also need medicine. Your doctor can help you find what works best for you.",
            }),
        new(4, "Is my vitamin D low?", "Is my vitamin D low?", "18 June", "18 June, 11:30",
            IsMain: false, SourceDocId: 6,
            Question: "My report says vitamin D 18 ng/mL. Is that low?",
            Paragraphs: new[]
            {
                "According to your documents, a vitamin D level below 20 ng/mL is usually considered low. So 18 is a little below the usual range.",
                "Low vitamin D is very common, especially for people who spend a lot of time indoors. It can be linked with tiredness and weaker bones.",
                "It is often improved with a little more sunlight, certain foods, or a supplement your doctor may suggest.",
            }),
        new(5, "Feeling tired and low iron", "Feeling tired and low iron", "3 May", "3 May, 14:48",
            IsMain: false, SourceDocId: 7,
            Question: "I feel tired all the time. Could low iron be the reason?",
            Paragraphs: new[]
            {
                "Your documents explain that low iron is one common reason people feel tired, short of breath, or look paler than usual.",
                "Iron helps your blood carry oxygen around your body. When iron is low, your body has to work harder.",
                "A simple blood test can check your iron. Your doctor can tell you if this is the cause and what might help.",
            }),
    };

    public IReadOnlyList<LibraryReport> LibraryReports { get; } = new List<LibraryReport>
    {
        new(1, "Blood Test – Sept 2026.pdf", "29 September", "PDF", "diabetes hba1c blood sugar"),
        new(2, "Thyroid Report.jpg", "29 September", "Photo", "thyroid"),
        new(3, "Cholesterol Results – Aug 2026.pdf", "14 August", "PDF", "heart cholesterol"),
        new(4, "Blood Pressure Log.jpg", "2 July", "Photo", "heart blood pressure"),
    };

    public IReadOnlyList<DocumentTopicGroup> DocumentGroups { get; } = new List<DocumentTopicGroup>
    {
        new("Diabetes", new[]
        {
            new DocumentEntry("Understanding Type 2 Diabetes",
                "What diabetes is, what your test results mean, and how it is usually managed.", "18 pages"),
            new DocumentEntry("Living Well with Type 2 Diabetes",
                "Everyday tips on food, activity and keeping track of your blood sugar.", "40 pages"),
        }),
        new("Thyroid", new[]
        {
            new DocumentEntry("Thyroid Basics",
                "How the thyroid works and what common thyroid test results show.", "12 pages"),
            new DocumentEntry("Living with an Underactive Thyroid",
                "Common signs, treatment options and what to expect over time.", "16 pages"),
        }),
        new("Heart Health", new[]
        {
            new DocumentEntry("Cholesterol Explained",
                "The difference between good and bad cholesterol, and how to read your results.", "10 pages"),
            new DocumentEntry("Caring for Your Heart",
                "Simple steps to support a healthy heart and blood pressure.", "22 pages"),
        }),
    };
}
