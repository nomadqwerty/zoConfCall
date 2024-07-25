"use client";
import { useEffect } from "react";
// import { useRouter } from "next/navigation";
import "./lobby.css";
import { Navbar } from "react-bootstrap";
import { Row, Col } from "react-bootstrap";

const Lobby = () => {
  useEffect(() => {
    // const router = useRouter();
    const form = document.getElementById("join-form"); // get form
    const clientNameInput = document.getElementById("client_name"); // get client_name input field

    clientNameInput.focus();
    if (form)
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        let inviteCode = e.target.invite_link.value;
        let clientName = e.target.client_name.value;
        // router.push(`rtc?accessKey=${inviteCode}`);

        window.location = `/rtc?accessKey=${inviteCode}&clientName=${clientName}`;
      });
  }, []);

  return (
    <div>
      <Navbar className="p-3">
        <nav className="navbar fluid">
          <img className="navbar-logo" src="/icons/logo.svg" alt="" />
        </nav>
      </Navbar>

      <Row className="form-container">
        <Col xs={12} className="form-col  p-0">
          <h1 className="w-100 lobby-title text-center">Videosprechstunde</h1>
          <p className="text-center mt-3 m-0 w-100">
            Falls Sie noch keinen Zugangscode erhalten haben kontaktieren Sie
            bitte Ihre Behandler:in.
          </p>

          <form id="join-form">
            <input
              title="Name"
              id="client_name"
              type="text"
              className="form-input mt-3 m-0 p-3 "
              name="client_name"
              placeholder="Wie möchten Sie sich nennen?"
              required
            ></input>
            <br></br>
            <input
            title="Zugangsschlüssel"
              id="invite_link"
              type="text"
              className="form-input m-0 mt-3 p-3"
              name="invite_link"
              placeholder="Wie lautet Ihr Zugangscode? "
              required
            ></input>
            <br></br>
            <input
              title="Raum betreten"
              className="btn submitBtn m-0 mt-3"
              type="submit"
              value="Beitreten "
            ></input>
          </form>
        </Col>
      </Row>
    </div>
  );
};

export default Lobby;
